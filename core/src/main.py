"""
This module is the main entry point for the Core FastAPI application.
It defines the FastAPI app instance, lifespan events, and API endpoints for
managing movies.
"""

import asyncio
import uuid
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, status
from sqlalchemy.orm import Session

from db.db import get_db, init_db
from models.movie import Movie
from schemas.movie import MovieCreate, MovieResponse, UploadConfirmRequest
from schemas.tmdbmovie import MovieDashboard, TmdbMovieList
from services.rabbitmq.rabbitmq import init_rabbitmq, publish_movie_event
from services.s3.config import get_s3_settings
from services.s3.s3_service import get_s3_client, init_s3_bucket
from services.tmdb.tmdbservice import (
    get_now_playing_movies,
    get_popular_movies,
    get_top_rated_movies,
    get_upcoming_movies,
)

from .dependencies import get_user_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    An asynchronous context manager to handle application startup and shutdown events.
    It prints a message when the application starts and when it shuts down.
    """
    print("[Core] Start FastApi")
    # Initialize the database (create tables if they don't exist)
    init_db()
    # Initialize the S3 bucket (create if not exists)
    init_s3_bucket()
    # Initialize RabbitMQ (connect and declare exchanges)
    await init_rabbitmq()
    yield
    print("[Core] Shutting Down FastApi")



# Initialize the FastAPI application with a title and the lifespan context manager.
app = FastAPI(title="Core FastAPI", lifespan=lifespan)


@app.get("/api/health/")
def health_check():
    """
    A simple health check endpoint.

    Returns:
        dict: A dictionary with a "status" key indicating the service is "OK".
    """
    return {"status": "OK"}

@app.get("/api/movies/dashboard/", response_model=MovieDashboard)
async def get_movie_dashboard():

    results = await asyncio.gather(
        get_now_playing_movies(page=1),
        get_popular_movies(page=1),
        get_upcoming_movies(page=1),
        get_top_rated_movies(page=1),
        return_exceptions=True 
    )

    # Helper to safely grab the 'results' list from the TMDB response
    def get_results(res):
        if isinstance(res, dict) and "results" in res:
            return res["results"]
        return []
    
    return MovieDashboard(
        now_playing=get_results(results[0]),
        popular=get_results(results[1]),
        upcoming=get_results(results[2]),
        top_rated=get_results(results[3])
    )

@app.get("/api/movies/popular/", response_model=TmdbMovieList)
async def get_popular(page: int = Query(1, ge=1)):
    data = await get_popular_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data

@app.get("/api/movies/now-playing/", response_model=TmdbMovieList)
async def now_playing(page: int = Query(1, ge=1)):
    data = await get_now_playing_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data

@app.get("/api/movies/upcoming/", response_model=TmdbMovieList)
async def upcoming(page: int = Query(1, ge=1)):
    data = await get_upcoming_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data

@app.get("/api/movies/top-rated/", response_model=TmdbMovieList)
async def top_rated(page: int = Query(1, ge=1)):
    data = await get_top_rated_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data


@app.get("/api/movies/", response_model=list[MovieResponse])
async def get_all_movies(db: Session = Depends(get_db)):
    """
    Retrieves a list of all movies from the database.

    Args:
        db (Session): The database session dependency.

    Returns:
        list[Movie]: A list of all movie records.
    """
    return db.query(Movie).all()


@app.get("/api/movies/{movie_id}", response_model=MovieResponse)
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


@app.post("/api/movie/", response_model=MovieResponse, status_code=status.HTTP_201_CREATED)
async def create_movie(
    movie_data: MovieCreate, 
    user_id: Annotated[str, Depends(get_user_id)],
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

    # Prepare the event payload for the message broker
    event_payload = {
        "id": movie.id,
        "created_by_user_id": movie.created_by_user_id,
    }
    
    # Publish the 'movie.created' event to RabbitMQ asynchronously
    await publish_movie_event("created", event_payload)

    return movie

@app.get("/api/upload-url")
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

@app.post("/api/upload-confirm", response_model=MovieResponse)
async def confirm_upload(    
        payload: UploadConfirmRequest,
        db: Session = Depends(get_db) 
): 
    """
    Confirms a file upload and updates the movie record.

    This endpoint is called after the frontend successfully uploads a file to S3.
    It constructs the public URL for the file, updates the movie's poster_url
    in the database, and publishes an update event.

    Args:
        payload (UploadConfirmRequest): Contains movie_id and the S3 file_key.
        db (Session): Database session.

    Returns:
        Movie: The updated movie object.
    """
    movie = db.query(Movie).filter(Movie.id == payload.movie_id).first()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    settings = get_s3_settings()

    # Construct the public URL. 
    # Note: In a local Docker environment, 's3-storage' is the internal hostname.
    # We replace it with 'localhost' so the URL is accessible from the host machine/browser.
    base_url = settings.S3_ENDPOINT_URL.replace("s3-storage", "localhost")
    public_poster_url = f"{base_url}/{settings.S3_BUCKET_NAME}/{payload.file_key}"

    # Update the movie record
    movie.poster_url = public_poster_url
    db.commit()
    db.refresh(movie)

    event_payload = {
        "id": movie.id,
        "poster_url": movie.poster_url,
        "created_by_user_id": movie.created_by_user_id,
    }

    # Publish the update event
    await publish_movie_event(event_action="updated", payload=event_payload)

    return movie