"""
Database Configuration Module.

This module sets up the SQLAlchemy engine, session factory, and base class for ORM models.
It also provides a dependency function `get_db` for managing database sessions.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from models.base import Base

from .config import get_settings

# Load settings from the configuration module.
# Using lru_cache ensures we don't re-read the environment variables on every import.
settings = get_settings()

# Retrieve the database URL constructed in the settings.
SQLALCHEMY_DATABASE_URL = settings.database_url

# Create the SQLAlchemy Engine.
# pool_pre_ping=True: Checks the connection before using it (prevents "server has gone away" errors).
# echo=True: Logs all generated SQL to stdout (useful for debugging, disable in production).
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True, 
    echo=True
)


# Create a SessionLocal class.
# This is a factory for creating new database sessions.
# expire_on_commit=False: Prevents attributes from expiring after commit (essential for async workflows).
SessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def init_db():
    """
    Initializes the database by creating all tables defined in the ORM models.
    This function is typically called on application startup.
    """
    print(f"[DB] Tables registered in metadata: {list(Base.metadata.tables.keys())}", flush=True)
    print("[DB] Creating tables...", flush=True)
    
    async with engine.begin() as conn:
        # WARNING: drop_all removes all data. Useful for development resets, 
        # but commented out here to prevent accidental data loss.
        # await conn.run_sync(Base.metadata.drop_all)
        
        # Create tables that don't exist yet
        await conn.run_sync(Base.metadata.create_all)
        
    print("[DB] Tables created.", flush=True)


async def get_db():
    """
    Dependency function that yields a database session.
    Ensures the session is closed after the request is finished.
    """
    async with SessionLocal() as db:
        yield db
