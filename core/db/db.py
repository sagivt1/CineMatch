"""
Database Configuration Module.

This module sets up the SQLAlchemy engine, session factory, and base class for ORM models.
It also provides a dependency function `get_db` for managing database sessions.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import get_settings

# Load settings from the configuration module.
# Using lru_cache ensures we don't re-read the environment variables on every import.
setting = get_settings()

# Retrieve the database URL constructed in the settings.
SQLALCHEMY_DATABASE_URL = setting.database_url

# Create the SQLAlchemy Engine.
# pool_pre_ping=True: Checks the connection before using it (prevents "server has gone away" errors).
# echo=True: Logs all generated SQL to stdout (useful for debugging, disable in production).
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    echo=True
)


# Create a SessionLocal class.
# This is a factory for creating new database sessions.
# autocommit=False: We manually commit transactions.
# autoflush=False: We manually flush changes to the DB.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create the Base class.
# All database models (tables) will inherit from this class.
Base = declarative_base()

def get_db():
    """
    Dependency function that yields a database session.
    Ensures the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()