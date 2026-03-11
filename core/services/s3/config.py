"""
S3 Configuration Module.

This module handles loading S3-related settings and environment variables
using Pydantic. It defines the S3 connection parameters and provides
a cached function to access these settings efficiently.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine the path to the .env file.
# We navigate up from core/services/s3/config.py to the project root (CineMatch/).
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
class S3Settings(BaseSettings):
    """
    S3 Settings Class.
    Inherits from BaseSettings to automatically load fields from environment variables.
    """

    S3_ENDPOINT_URL: str
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str
    S3_BUCKET_NAME: str
    S3_AVATAR_BUCKET_NAME: str | None = None
    S3_REGION: str = "us-east-1"

    # Configuration for Pydantic Settings
    # env_file: Path to the environment file
    # extra="ignore": Ignore any extra environment variables not defined in this class
    
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH, env_file_encoding="utf-8", extra="ignore"
    )

@lru_cache()
def get_s3_settings() -> S3Settings:
    """
    Factory function to create and cache the S3Settings instance.
    """
    return S3Settings()
