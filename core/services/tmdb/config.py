"""
TMDB Configuration Module.

This module handles loading TMDB-related settings and environment variables
using Pydantic. It defines the TMDB connection parameters and provides
a cached function to access these settings efficiently.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine the path to the .env file.
# We navigate up from core/services/tmdb/config.py to the project root.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

class TMDBSettings(BaseSettings):
    """
    TMDB Settings Class.
    Inherits from BaseSettings to automatically load fields from environment variables.
    """

    TMDB_READ_ACCESS_TOKEN: str
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_LANGUAGE: str = "en-US"

    # Configuration for Pydantic Settings
    # env_file: Path to the environment file
    # extra="ignore": Ignore any extra environment variables not defined in this class
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH, env_file_encoding="utf-8", extra="ignore"
    )

@lru_cache()
def get_tmdb_settings() -> TMDBSettings:
    """
    Factory function to create and cache the TMDBSettings instance.
    """
    return TMDBSettings()