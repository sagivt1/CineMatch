"""
This module contains the core FastAPI application.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    A context manager for the lifespan of the FastAPI application.
    It prints a message when the application starts and when it shuts down.
    """
    print("[Core] Start FastApi")
    yield
    print("[Core] Shuting Down FastApi")


app = FastAPI(title="Core FastAPI", lifespan=lifespan)


@app.get("/health")
def health_check():
    """
    A health check endpoint that returns a status of 'OK'.
    """
    return {"status": "OK"}
