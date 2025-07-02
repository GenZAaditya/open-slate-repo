import os
import json
import boto3
import urllib.request
import urllib.error
import logging
from datetime import datetime, timezone
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS Setup
DDB_TABLE = os.environ['DDB_TABLE_NAME']
LLAMA_API_KEY = os.environ['LLAMA_CLOUD_API_KEY']
ddb = boto3.resource('dynamodb').Table(DDB_TABLE)

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-User-Id",
        "Content-Type": "application/json"
    }

    try:
        logger.info(f"Event received: {json.dumps(event, default=str)}")

        # Safe parameter extraction
        path_params = event.get('pathParameters') or {}
        headers_raw = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
        query_params = event.get('queryStringParameters') or {}

        job_id = path_params.get('job_id')
        user_id = headers_raw.get('user-id') or query_params.get('user_id') or headers_raw.get('x-user-id')

        logger.info(f"Extracted - job_id: {job_id}, user_id: {user_id}")

        if not job_id:
            return error_response("Missing job_id in path", headers)

        if not user_id:
            return error_response("Missing user ID", headers)

        # Get job from DynamoDB
        job = get_job_record(job_id, user_id)
        if not job:
            return error_response("Job not found", headers, 404)

        logger.info(f"Current job status: {job.get('status')}")
        logger.info(f"Job has result: {'result' in job}")

        # Return cached result if already completed
        if job['status'] in ['SUCCESS', 'FAILED']:
            logger.info("Returning cached result")
            return format_success_response(job, headers)

        # Directly fetch extraction results from LlamaIndex API
        logger.info("Fetching extraction results directly...")
        api_result = fetch_llama_results(job_id)
        logger.info(f"API returned status: {api_result.get('status')}")
        
        # Update job based on API result
        updated_job = update_job_status(job_id, user_id, job, api_result)
        logger.info(f"Updated job status: {updated_job.get('status')}")

        return format_success_response(updated_job, headers)

    except Exception as e:
        logger.error(f"Error in lambda_handler: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return error_response("Internal server error", headers, 500)

def get_job_record(job_id, user_id):
    """Get job record with user validation"""
    try:
        response = ddb.get_item(Key={'job_id': job_id})
        job = response.get('Item')
        
        if not job:
            logger.info(f"No job found for ID: {job_id}")
            return None

        # Validate user owns this job
        if job.get('user_id') != user_id:
            logger.info(f"User mismatch: {job.get('user_id')} vs {user_id}")
            return None

        return job
    except ClientError as e:
        logger.error(f"DynamoDB error: {e.response['Error']['Message']}")
        return None

def fetch_llama_results(job_id):
    """
    Get extraction result with FIXED logic
    """
    status_endpoint = f"https://api.cloud.llamaindex.ai/api/v1/extraction/jobs/{job_id}"
    result_endpoint = f"https://api.cloud.llamaindex.ai/api/v1/extraction/jobs/{job_id}/result"
    
    logger.info(f"🔍 Checking job: {job_id}")
    logger.info(f"📍 Status endpoint: {status_endpoint}")
    logger.info(f"📍 Result endpoint: {result_endpoint}")
    
    # Try status endpoint first
    try:
        req = urllib.request.Request(status_endpoint)
        req.add_header('Authorization', f'Bearer {LLAMA_API_KEY}')
        req.add_header('Accept', 'application/json')
        req.add_header('User-Agent', 'AWS-Lambda-Python/1.0')
        
        logger.info(f"🔐 Using API key: {LLAMA_API_KEY[:10]}...{LLAMA_API_KEY[-5:]}")
        
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                status_data = response.read().decode('utf-8')
                status_result = json.loads(status_data)
                logger.info(f"✅ Job status response: {json.dumps(status_result, indent=2)}")
                
                # Check if job is completed
                job_status = status_result.get('status', '').upper()
                logger.info(f"🔄 Job status: {job_status}")
                
                if job_status == 'SUCCESS':  # ✅ FIXED: Handle SUCCESS status
                    logger.info("🎯 Job completed successfully, fetching results...")
                    # Continue to fetch results below
                elif job_status == 'PROCESSING':
                    logger.info("⏳ Job is still processing")
                    return {'status': 'PROCESSING'}
                elif job_status == 'FAILED':
                    logger.info("❌ Job failed on external service")
                    return {'status': 'FAILED', 'error': 'Job failed on external service'}
                elif job_status == 'PENDING':
                    logger.info("🔄 Job is still pending")
                    return {'status': 'PENDING'}
                else:
                    logger.info(f"🔄 Unknown job status: {job_status}")
                    return {'status': 'PENDING'}
            else:
                logger.error(f"❌ Status check failed: {response.status}")
                
    except urllib.error.HTTPError as e:
        logger.error(f"❌ Status HTTP Error: {e.code} {e.reason}")
        if e.code == 404:
            logger.error("🚨 Job not found - this might be the issue!")
            return {'status': 'FAILED', 'error': 'Job not found on external service'}
        elif e.code in [401, 403]:
            logger.error("🔐 Authentication failed")
            return {'status': 'FAILED', 'error': f'Auth error: {e.code}'}
    except Exception as e:
        logger.error(f"⚠️ Status check error: {str(e)}")
    
    # Now try result endpoint (only if job status was SUCCESS)
    try:
        req = urllib.request.Request(result_endpoint)
        req.add_header('Authorization', f'Bearer {LLAMA_API_KEY}')
        req.add_header('Accept', 'application/json')
        req.add_header('User-Agent', 'AWS-Lambda-Python/1.0')
        
        logger.info(f"📥 Fetching results from: {result_endpoint}")
        
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                data = response.read().decode('utf-8')
                result = json.loads(data)
                logger.info(f"✅ Got result: {json.dumps(result, indent=2)}")
                
                if is_valid_extraction(result):
                    return {
                        'status': 'SUCCESS',
                        'extracted_data': result
                    }
                else:
                    logger.warning("⚠️ Invalid extraction data received")
                    return {
                        'status': 'FAILED',
                        'error': 'Invalid extraction data'
                    }
            else:
                logger.error(f"❌ Result fetch failed: {response.status}")
                
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode('utf-8')
            logger.error(f"❌ HTTP {e.code} Error Body: {error_body}")
        except:
            pass
            
        if e.code == 400:
            logger.error("🚨 HTTP 400 - Bad Request Details:")
            logger.error(f"   - Job ID: {job_id}")
            logger.error(f"   - URL: {result_endpoint}")
            logger.error(f"   - Error Response: {error_body}")
            return {
                'status': 'FAILED',
                'error': f'Bad Request (400): {error_body[:200] if error_body else "Unknown error"}'
            }
        elif e.code == 404:
            logger.info("🔍 Result not ready (404) - but status was SUCCESS, this is weird")
            return {'status': 'PROCESSING'}
        elif e.code in [401, 403]:
            logger.error(f"🔐 Auth error: {e.code} {e.reason}")
            return {
                'status': 'FAILED',
                'error': f"Authentication error: {e.code} {e.reason}"
            }
        else:
            logger.error(f"❌ HTTP {e.code}: {e.reason}")
            
    except urllib.error.URLError as e:
        logger.error(f"🌐 Network error: {e.reason}")
    except Exception as e:
        logger.error(f"⚠️ Unexpected error: {str(e)}")
    
    # If we reach here, the status was SUCCESS but we couldn't fetch results
    return {
        'status': 'FAILED',
        'error': 'Job completed but could not retrieve results'
    }
      
def is_valid_extraction(data):
    """Check if extraction data is valid"""
    if not data:
        return False
    if isinstance(data, dict):
        # Check for empty dict or error messages
        if not data or 'error' in data or 'message' in data:
            return False
        return True
    return True  # Other types considered valid

def update_job_status(job_id, user_id, current_job, api_result):
    """Update job status in DynamoDB based on API result"""
    try:
        now = datetime.now(timezone.utc).isoformat()
        new_status = api_result['status']

        # Prepare update expression
        update_expr = 'SET #status = :status, updated_at = :now'
        expr_values = {
            ':status': new_status,
            ':now': now
        }
        expr_names = {'#status': 'status'}

        # Add result data if successful
        if new_status == 'SUCCESS' and 'extracted_data' in api_result:
            # Convert to JSON string
            result_data = json.dumps(api_result['extracted_data'])
            update_expr += ', #result = :result'
            expr_names['#result'] = 'result'
            expr_values[':result'] = result_data
            logger.info("Adding extracted data to update")

        # Add error info if failed
        elif new_status == 'FAILED' and 'error' in api_result:
            update_expr += ', error_message = :error'
            expr_values[':error'] = api_result['error']

        logger.info(f"Update expression: {update_expr}")
        logger.info(f"Expression values: {json.dumps(expr_values, default=str)}")

        # Update DynamoDB
        response = ddb.update_item(
            Key={'job_id': job_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )

        updated_job = response['Attributes']
        logger.info(f"DynamoDB update successful. New status: {updated_job.get('status')}")
        return updated_job

    except ClientError as e:
        logger.error(f"DB update failed: {e.response['Error']['Message']}")
        # Return current job with updated status for response
        current_job['status'] = new_status
        current_job['updated_at'] = now
        if new_status == 'SUCCESS' and 'extracted_data' in api_result:
            current_job['result'] = json.dumps(api_result['extracted_data'])
        return current_job

def format_success_response(job, headers):
    """Format success response with consistent structure"""
    response_data = {
        'success': True,  # ✅ Add this field
        'job_id': job['job_id'],
        'status': job['status'],
        'filename': job.get('filename', ''),
        'updated_at': job.get('updated_at', ''),
        'created_at': job.get('created_at', ''),
        'message': f"Status: {job['status']}"  # ✅ Add message field
    }

    # For successful jobs
    if job['status'] == 'SUCCESS' and 'result' in job:
        try:
            # Parse JSON if stored as string
            result_data = json.loads(job['result']) if isinstance(job['result'], str) else job['result']
            response_data['data'] = result_data  # ✅ Use 'data' field as expected by frontend
            response_data['message'] = 'Extraction completed successfully!'
        except (TypeError, json.JSONDecodeError):
            # Already in object form
            response_data['data'] = job['result']
    # For failed jobs
    elif job['status'] == 'FAILED':
        response_data['error'] = job.get('error_message', 'Unknown error')
        response_data['message'] = 'Extraction failed'

    return {
        'statusCode': 200,
        'body': json.dumps(response_data, default=str),
        'headers': headers
    }

def error_response(message, headers, status_code=400):
    """Error response with consistent structure"""
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'success': False,  # ✅ Add this for consistency
            'error': message
        }),
        'headers': headers
    }