import os
import json
import base64
import boto3
import urllib3
from datetime import datetime
import logging
import uuid

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS environment variables  
S3_BUCKET = os.environ.get('S3_BUCKET_NAME', 'Zenathon')
DDB_TABLE = os.environ.get('DDB_TABLE_NAME')
LLAMA_API_KEY = os.environ.get('LLAMA_CLOUD_API_KEY')
EXTRACTION_AGENT_ID = os.environ.get('EXTRACTION_AGENT_ID', '7949ce63-fbd0-41cc-9264-4e427658eb25')

# AWS clients
s3_client = boto3.client('s3')
ddb_client = boto3.client('dynamodb')

# HTTP client
http = urllib3.PoolManager()

def lambda_handler(event, context):
    """Handle both HTTP requests and SQS messages"""
    try:
        # Handle OPTIONS request for CORS
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': ''
            }
        
        # Check if this is an HTTP request (API Gateway) or SQS message
        if 'Records' in event:
            # Handle SQS messages
            return handle_sqs_messages(event, context)
        else:
            # Handle HTTP request
            return handle_http_request(event, context)
    
    except Exception as e:
        logger.error(f"Unhandled error in lambda_handler: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def handle_http_request(event, context):
    """Handle direct HTTP POST request from frontend"""
    try:
        # Parse request body
        if 'body' not in event:
            raise ValueError("No request body found")
        
        request_body = json.loads(event['body'])
        filename = request_body.get('filename')
        file_content = request_body.get('file_content')  # base64 encoded
        user_id = request_body.get('user_id')
        config = request_body.get('config', {})
        
        # Validate required fields
        if not all([filename, file_content, user_id]):
            raise ValueError("Missing required fields: filename, file_content, user_id")
        
        logger.info(f"Processing HTTP request for user {user_id}")
        
        # Decode file content
        try:
            file_bytes = base64.b64decode(file_content)
        except Exception as e:
            raise ValueError(f"Invalid base64 file content: {e}")
        
        # Upload to S3 first
        s3_key = upload_to_s3(user_id, filename, file_bytes)
        
        # Start extraction job - THIS GENERATES THE JOB ID WE'LL USE
        extraction_job_id = start_extraction_job(filename, file_bytes, config)
        
        # Create job record using extraction_job_id as the primary job_id
        create_job_record(extraction_job_id, user_id, filename, s3_key)
        
        logger.info(f"Successfully processed HTTP request for job {extraction_job_id}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'job_id': extraction_job_id,  # Return extraction_job_id as job_id
                'extraction_job_id': extraction_job_id,  # Keep for backward compatibility
                's3_key': s3_key,
                'status': 'EXTRACTING'
            })
        }
        
    except Exception as e:
        logger.error(f"Error in handle_http_request: {str(e)}", exc_info=True)
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'error': 'Bad Request',
                'message': str(e)
            })
        }

def handle_sqs_messages(event, context):
    """Process SQS messages"""
    for record in event['Records']:
        try:
            # Parse SQS message
            message_body = json.loads(record['body'])
            job_id = message_body['job_id']  # This should now be extraction_job_id
            user_id = message_body['user_id']
            filename = message_body['filename']
            config = message_body.get('config', {})
            
            logger.info(f"Processing SQS job {job_id} for user {user_id}")
            
            # Since we're not storing file_data in DDB anymore, 
            # SQS message should include file_data or S3 key
            if 'file_data_base64' in message_body:
                file_bytes = base64.b64decode(message_body['file_data_base64'])
            elif 's3_key' in message_body:
                # Get file from S3
                file_bytes = get_file_from_s3(message_body['s3_key'])
            else:
                raise ValueError("No file data or S3 key in SQS message")
            
            # Update status to PROCESSING
            update_job_status(job_id, "PROCESSING")
            
            # Upload to S3 if not already there
            if 'file_data_base64' in message_body:
                s3_key = upload_to_s3(user_id, filename, file_bytes)
                # Update with S3 key
                update_job_with_s3_key(job_id, s3_key)
            
            logger.info(f"Successfully processed SQS job {job_id}")
            
        except Exception as e:
            logger.error(f"Error processing SQS job {job_id}: {str(e)}", exc_info=True)
            # Update status to FAILED
            try:
                update_job_status(job_id, "FAILED", str(e))
            except:
                pass
    
    return {'statusCode': 200}

def create_job_record(job_id, user_id, filename, s3_key):
    """Create initial job record in DynamoDB - NO FILE DATA STORED"""
    try:
        now = datetime.utcnow().isoformat()
        
        ddb_client.put_item(
            TableName=DDB_TABLE,
            Item={
                'job_id': {'S': job_id},  # Using extraction_job_id as job_id
                'user_id': {'S': user_id},
                'filename': {'S': filename},
                's3_key': {'S': s3_key},
                'extraction_job_id': {'S': job_id},  # Same as job_id now
                'status': {'S': 'EXTRACTING'},
                'created_at': {'S': now},
                'updated_at': {'S': now}
                # REMOVED: file_data field - no more base64 storage
            }
        )
        
        logger.info(f"Created job record for {job_id}")
        
    except Exception as e:
        raise ValueError(f"Failed to create job record: {e}")

def get_file_from_s3(s3_key):
    """Get file data from S3"""
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        return response['Body'].read()
        
    except Exception as e:
        raise ValueError(f"Failed to get file from S3: {e}")

def upload_to_s3(user_id, filename, file_bytes):
    """Upload file to S3"""
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')[:-3]
    s3_key = f"users/{user_id}/documents/{timestamp}_{filename}"
    
    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=file_bytes,
        Metadata={
            'user_id': user_id,
            'original_filename': filename,
            'upload_timestamp': timestamp
        }
    )
    
    return s3_key

def start_extraction_job(filename, file_bytes, config):
    """Start LlamaIndex extraction job"""
    try:
        fields = {'extraction_agent_id': EXTRACTION_AGENT_ID}
        
        if config.get('data_schema'):
            fields['data_schema_override'] = json.dumps(config['data_schema'])
        if config.get('extraction_mode'):
            fields['extraction_mode'] = config['extraction_mode']
        
        files = {'file': (filename, file_bytes, 'application/pdf')}
        body, content_type = encode_multipart_formdata(fields, files)
        
        response = http.request(
            'POST',
            'https://api.cloud.llamaindex.ai/api/v1/extraction/jobs/file',
            body=body,
            headers={
                'Authorization': f'Bearer {LLAMA_API_KEY}',
                'Content-Type': content_type,
                'Accept': 'application/json'
            },
            timeout=60
        )
        
        if response.status != 200:
            raise Exception(f"API error {response.status}: {response.data.decode()}")
        
        job_data = json.loads(response.data.decode())
        extraction_job_id = job_data.get('id')
        
        if not extraction_job_id:
            raise ValueError("No extraction job ID returned")
            
        return extraction_job_id
        
    except Exception as e:
        raise ValueError(f"Failed to start extraction: {e}")

def update_job_status(job_id, status, error_message=None):
    """Update job status in DynamoDB"""
    try:
        now = datetime.utcnow().isoformat()
        
        update_expression = "SET #status = :status, updated_at = :updated_at"
        expression_values = {
            ":status": {"S": status},
            ":updated_at": {"S": now}
        }
        expression_names = {"#status": "status"}
        
        if error_message:
            update_expression += ", error_message = :error"
            expression_values[":error"] = {"S": error_message}
        
        ddb_client.update_item(
            TableName=DDB_TABLE,
            Key={"job_id": {"S": job_id}},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names
        )
        
        logger.info(f"Updated job {job_id} status to {status}")
        
    except Exception as e:
        logger.error(f"Failed to update job status: {e}")

def update_job_with_s3_key(job_id, s3_key):
    """Update job with S3 key"""
    try:
        now = datetime.utcnow().isoformat()
        
        ddb_client.update_item(
            TableName=DDB_TABLE,
            Key={"job_id": {"S": job_id}},
            UpdateExpression="SET s3_key = :s3_key, updated_at = :updated_at",
            ExpressionAttributeValues={
                ":s3_key": {"S": s3_key},
                ":updated_at": {"S": now}
            }
        )
        
        logger.info(f"Updated job {job_id} with S3 key")
        
    except Exception as e:
        logger.error(f"Failed to update job with S3 key: {e}")

def encode_multipart_formdata(fields, files):
    """Encode multipart form data"""
    boundary = uuid.uuid4().hex
    body = b''
    
    for key, value in fields.items():
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode()
        body += f'{value}\r\n'.encode()
    
    for key, (filename, file_data, content_type) in files.items():
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode()
        body += f'Content-Type: {content_type}\r\n\r\n'.encode()
        body += file_data
        body += b'\r\n'
    
    body += f'--{boundary}--\r\n'.encode()
    content_type = f'multipart/form-data; boundary={boundary}'
    
    return body, content_type