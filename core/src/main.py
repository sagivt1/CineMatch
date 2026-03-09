"""
This module is the main entry point for the Core FastAPI application.
It defines the FastAPI app instance, lifespan events, and API endpoints for
managing movies.
"""

import uuid
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from db.db import get_db, init_db
from models.movie import Movie
from schemas.movie import MovieCreate, MovieResponse
from services.s3.config import get_s3_settings
from services.s3.s3_service import get_s3_client, init_s3_bucket

from .dependencies import get_user_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    An asynchronous context manager to handle application startup and shutdown events.
    It prints a message when the application starts and when it shuts down.
    """
    print("[Core] Start FastApi")
    init_db()
    init_s3_bucket()
    yield
    print("[Core] Shuting Down FastApi")


# Initialize the FastAPI application with a title and the lifespan context manager.
app = FastAPI(title="Core FastAPI", lifespan=lifespan)


@app.get("/health")
def health_check():
    """
    A simple health check endpoint.

    Returns:
        dict: A dictionary with a "status" key indicating the service is "OK".
    """
    return {"status": "OK"}


@app.get("/movies/", response_model=list[MovieResponse])
async def get_all_movies(db: Session = Depends(get_db)):
    """
    Retrieves a list of all movies from the database.

    Args:
        db (Session): The database session dependency.

    Returns:
        list[Movie]: A list of all movie records.
    """
    return db.query(Movie).all()


@app.get("/movies/{movie_id}", response_model=MovieResponse)
async def get_movie_by_id(movie_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a specific movie by its ID.

    Args:
        movie_id (int): The ID of the movie to retrieve.
        db (Session): The database session dependency.

    Returns:
        Movie: The movie object if found.

    Raises:
        HTTPException: If the movie with the given ID is not found (404 Not Found).
    """
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@app.post("/movies/", response_model=MovieResponse, status_code=status.HTTP_201_CREATED)
async def create_movie(
    movie_data: MovieCreate, 
    user_id: Annotated[int, Depends(get_user_id)],
    db: Session = Depends(get_db)
):
    """
    Creates a new movie entry.

    This endpoint takes movie data, validates it using the `MovieCreate` schema,
    and uses the `get_user_id` dependency to ensure the user is authenticated.
    It then creates a new `Movie` ORM object and persists it to the database.

    Args:
        movie_data (MovieCreate): The movie data from the request body.
        user_id (int): The authenticated user's ID, injected by the `get_user_id` dependency.
        db (Session): The database session dependency.

    Returns:
        Movie: The newly created movie object, which FastAPI will serialize
               into a JSON response according to the `MovieResponse` schema.
    """
    # Create a new SQLAlchemy Movie model instance
    movie = Movie(
        **movie_data.model_dump(mode="json"),  # Unpack the Pydantic model data
        created_by_user_id=user_id,  # Assign the creator's user ID
    )

    db.add(movie)
    db.commit()
    db.refresh(movie)

    return movie

@app.get("/upload-url")
def generate_presigned_url(
    filename: str, 
    s3_client = Depends(get_s3_client)
):
    """
    Generates a presigned URL for uploading a file to S3.

    This endpoint creates a unique filename, constructs the S3 object key,
    and generates a temporary URL that allows the client to upload a file
    directly to the S3 bucket.

    Args:
        filename (str): The original filename (used to extract extension).
        s3_client: The S3 client injected by dependency.

    Returns:
        dict: Contains 'upload_url' and 'file_key'.
    """
    setting = get_s3_settings()
    bucket_name = setting.S3_BUCKET_NAME
    
    # Generate a unique filename using UUID to prevent overwrites.
    file_extension = filename.split('.')[-1] if '.' in filename else ''
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    object_name = f"posters/{unique_filename}"

    try:
        # Generate a presigned URL for the 'put_object' operation.
        # This allows the frontend to upload directly to S3 without passing through the backend.
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_name,
                'ContentType': 'image/jpeg'
            },
            ExpiresIn=3600
        )

        return {
            "upload_url": presigned_url,
            "file_key": object_name
        }
    except Exception as e:
        # Log the error (in a real app) and return a 500 response.
        raise HTTPException(
            status_code=500, 
            detail=f"Could not generate upload URL: {str(e)}"
        )
