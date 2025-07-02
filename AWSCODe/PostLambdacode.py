import os
import json
import base64
import boto3
import urllib3
import urllib.parse
from datetime import datetime
import io
import cgi
from io import BytesIO
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
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return cors_response()
        
        logger.info(f"Processing request: {event.get('httpMethod', 'POST')}")
        
        # Get headers and user_id
        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        user_id = extract_user_id(event, headers)
        
        if not user_id:
            return error_response("Missing user_id in headers")
        
        # Parse request data
        content_type = headers.get('content-type', '').lower()
        
        if 'multipart/form-data' in content_type:
            filename, file_bytes, config = parse_multipart_form_data(event)
        else:
            filename, file_bytes, config = parse_json_payload(event)
        
        logger.info(f"Processing file: {filename} ({len(file_bytes)} bytes) for user: {user_id}")
        
        # Upload to S3
        s3_key = upload_to_s3(user_id, filename, file_bytes)
        
        # Start extraction job
        job_id = start_extraction_job(filename, file_bytes, config)
        
        # Store in DynamoDB
        store_job_record(job_id, user_id, filename, s3_key, config)
        
        return success_response({
            "job_id": job_id,
            "user_id": user_id,
            "status": "PENDING",
            "filename": filename,
            "message": f"Use GET /api/extraction/status/{job_id} to check progress"
        })
        
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return error_response(str(e))

def extract_user_id(event, headers):
    """Extract user_id from headers, query params, or body"""
    # Check headers first
    user_id = headers.get('x-user-id') or headers.get('user-id')
    
    # Check query parameters
    if not user_id and event.get('queryStringParameters'):
        user_id = event['queryStringParameters'].get('user_id')
    
    # Check body for JSON requests
    if not user_id and event.get('body'):
        try:
            body = json.loads(event['body'])
            user_id = body.get('user_id')
        except:
            pass
    
    # Basic validation
    if user_id and len(user_id) >= 8:
        return user_id
    
    return None

def parse_json_payload(event):
    """Parse JSON request body"""
    if not event.get('body'):
        raise ValueError("No body found in request")
        
    try:
        body = json.loads(event['body'])
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")
        
    filename = body.get('filename')
    file_content_base64 = body.get('file_content')
    config = body.get('config', {})
    
    if not filename or not file_content_base64:
        raise ValueError("Missing filename or file_content")
        
    try:
        file_bytes = base64.b64decode(file_content_base64)
    except Exception as e:
        raise ValueError(f"Invalid base64 content: {e}")
    
    return filename, file_bytes, config

def parse_multipart_form_data(event):
    """Parse multipart form data"""
    try:
        raw_body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            body = base64.b64decode(raw_body)
        else:
            body = raw_body.encode('utf-8') if isinstance(raw_body, str) else raw_body
        
        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        content_type = headers.get('content-type', '')
        
        if 'boundary=' not in content_type:
            raise ValueError("No boundary in Content-Type")
        
        environ = {
            'REQUEST_METHOD': 'POST',
            'CONTENT_TYPE': content_type,
            'CONTENT_LENGTH': str(len(body))
        }
        
        form = cgi.FieldStorage(
            fp=BytesIO(body),
            environ=environ,
            keep_blank_values=True
        )
        
        if 'file' not in form:
            raise ValueError("No 'file' field found")
            
        file_item = form['file']
        if not hasattr(file_item, 'filename') or not file_item.filename:
            raise ValueError("No filename in file field")
            
        filename = file_item.filename
        file_bytes = file_item.file.read()
        
        if len(file_bytes) == 0:
            raise ValueError("Empty file")
        
        # Parse config if present
        config = {}
        if 'config' in form:
            try:
                config = json.loads(form['config'].value)
            except:
                config = {}
        
        return filename, file_bytes, config
        
    except Exception as e:
        raise ValueError(f"Failed to parse multipart data: {e}")

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
        job_id = job_data.get('id')
        
        if not job_id:
            raise ValueError("No job ID returned")
            
        return job_id
        
    except Exception as e:
        raise ValueError(f"Failed to start extraction: {e}")

def store_job_record(job_id, user_id, filename, s3_key, config):
    """Store job record in DynamoDB with simple structure"""
    try:
        now = datetime.utcnow().isoformat()
        
        item = {
            "job_id": {"S": job_id},
            "user_id": {"S": user_id},
            "filename": {"S": filename},
            "s3_key": {"S": s3_key},
            "status": {"S": "PENDING"},
            "created_at": {"S": now},
            "updated_at": {"S": now},
            "config": {"S": json.dumps(config)}
        }
        
        ddb_client.put_item(TableName=DDB_TABLE, Item=item)
        logger.info(f"Stored job record: {job_id}")
        
    except Exception as e:
        logger.error(f"Failed to store job record: {e}")
        # Don't fail the entire request for DB issues
        
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

def cors_response():
    """CORS preflight response"""
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-User-Id,User-Id,x-user-id",
            "Access-Control-Max-Age": "86400"
        },
        "body": ""
    }
        
def success_response(data):
    """Success response"""
    return {
        "statusCode": 200,
        "body": json.dumps({"success": True, **data}),
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-User-Id,User-Id,x-user-id",
            "Content-Type": "application/json"
        }
    }

def error_response(error_msg):
    """Error response"""
    return {
        "statusCode": 400,
        "body": json.dumps({"success": False, "error": error_msg}),
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-User-Id,User-Id,x-user-id",
            "Content-Type": "application/json"
        }
    }