"""
S3 Service Module.

This module handles interactions with AWS S3 (or compatible services like MinIO).
It provides functions to obtain an authenticated S3 client and to initialize
the required storage bucket.
"""
import json
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# import setting from s3/config
from .config import get_s3_settings


def get_s3_client():
    """
    Creates and returns a configured boto3 S3 client.
    
    Uses settings from the configuration module to establish the connection.
    """
    setting = get_s3_settings()
    
    # Create the S3 client.
    # signature_version='s3v4': Required for some S3-compatible services (like MinIO)
    # and newer AWS regions to ensure requests are properly signed.
    return boto3.client(
        's3',
        endpoint_url=setting.S3_ENDPOINT_URL,
        aws_access_key_id=setting.S3_ACCESS_KEY_ID,
        aws_secret_access_key=setting.S3_SECRET_ACCESS_KEY,
        region_name=setting.S3_REGION,
        config=Config(signature_version='s3v4'),
    )


def init_s3_bucket(bucket_name: str, public_read: bool = True):
    """
    Initializes the S3 bucket with the given name.

    Checks if the bucket exists. If it does not (404 error), it creates it.
    """
    client = get_s3_client()

    try:
        # head_bucket is a cheap call to check if a bucket exists and we have permission to access it.
        client.head_bucket(Bucket=bucket_name)
        print(f"[S3] Bucket {bucket_name} already exists.", flush=True)
    except ClientError as e:
        # Parse the error code from the exception response.
        error_code = e.response.get('Error', {}).get('Code')
        
        # If the error is 404, the bucket does not exist, so we create it.
        if error_code == "404":
            print(f"[S3] Bucket {bucket_name} not found. Creating...", flush=True)
            client.create_bucket(Bucket=bucket_name)
            print(f"[S3] Bucket {bucket_name} created successfully.", flush=True)
        else:
            # Re-raise or log unexpected errors (e.g., 403 Forbidden).
            print(f"[S3] Unexpected error checking bucket: {e}", flush=True)

    # Ensure bucket objects are publicly readable so the frontend can display images
    # via direct URLs (avatars/posters) without signed GET requests.
    if public_read:
        public_read_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
                }
            ],
        }

        try:
            client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(public_read_policy))
            print(f"[S3] Bucket {bucket_name} policy set to public read.", flush=True)
        except ClientError as e:
            print(f"[S3] Failed to set bucket policy: {e}", flush=True)
