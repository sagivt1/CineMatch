"""
This module is the main entry point for the Core FastAPI application.
It defines the FastAPI app instance, lifespan events, and API endpoints for
managing movies.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from db.db import init_db
from routers.movies import router as movies_router
from services.rabbitmq.rabbitmq import init_rabbitmq
from services.s3.s3_service import init_s3_bucket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for the FastAPI application.
    
    Handles the initialization of external resources (Database, S3, RabbitMQ)
    on startup and performs necessary cleanup on shutdown.
    """
    print("[Core] Start FastApi")
    # Initialize the database (create tables if they don't exist)
    await init_db()
    # Initialize the S3 bucket (create if not exists)
    init_s3_bucket()
    # Initialize RabbitMQ (connect and declare exchanges)
    await init_rabbitmq()
    
    # Yield control to the application to start serving requests
    yield
    
    # Code after yield runs on application shutdown
    print("[Core] Shutting Down FastApi")



# Initialize the FastAPI application with a title and the lifespan context manager.
app = FastAPI(
    title="CineMatch Core API",
    lifespan=lifespan
)

# Include routers to register API endpoints
app.include_router(movies_router)


@app.get("/api/health/", tags=["Health"])
def health_check():
    """
    Simple health check endpoint to verify the service is running.
    """
    return {"status": "OK"}
