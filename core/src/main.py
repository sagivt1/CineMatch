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
from schemas.movie import MovieCreate, MovieResponse, UploadConfirmRequest
from services.s3.config import get_s3_settings
from services.s3.s3_service import get_s3_client, init_s3_bucket
from services.rabbitmq.rabbitmq import init_rabbitmq, publish_movie_event

from .dependencies import get_user_id

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def resolve_content_type(content_type: str | None) -> str:
    if not content_type:
        return "image/jpeg"

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image content type.")

    return content_type


def resolve_avatar_bucket() -> str:
    settings = get_s3_settings()
    return settings.S3_AVATAR_BUCKET_NAME or f"{settings.S3_BUCKET_NAME}-avatars"


def build_public_url(file_key: str, bucket_name: str | None = None) -> str:
    settings = get_s3_settings()
    resolved_bucket = bucket_name or settings.S3_BUCKET_NAME
    base_url = settings.S3_ENDPOINT_URL.replace("s3-storage", "localhost")
    return f"{base_url}/{resolved_bucket}/{file_key}"


def create_presigned_upload(
    filename: str,
    content_type: str,
    prefix: str,
    s3_client,
    bucket_name: str | None = None,
    object_name: str | None = None,
) -> dict:
    import boto3
    from botocore.config import Config
    
    settings = get_s3_settings()
    resolved_bucket = bucket_name or settings.S3_BUCKET_NAME

    if object_name:
        object_name = object_name.strip("/")
    else:
        file_extension = filename.split('.')[-1] if '.' in filename else ''
        unique_filename = f"{uuid.uuid4()}"
        if file_extension:
            unique_filename = f"{unique_filename}.{file_extension}"

        sanitized_prefix = prefix.strip("/")
        object_name = f"{sanitized_prefix}/{unique_filename}" if sanitized_prefix else unique_filename

    try:
        # The S3 presigned URL signs the Host header.
        # We must generate the URL using the external endpoint the browser will use (localhost),
        # instead of the internal Docker hostname (s3-storage), otherwise MinIO rejects the signature.
        external_endpoint = settings.S3_ENDPOINT_URL.replace("s3-storage", "localhost")
        
        external_client = boto3.client(
            's3',
            endpoint_url=external_endpoint,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version='s3v4'),
        )

        presigned_url = external_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': resolved_bucket,
                'Key': object_name,
                'ContentType': content_type,
            },
            ExpiresIn=3600,
        )

        return {
            "upload_url": presigned_url,
            "file_key": object_name,
            "public_url": build_public_url(object_name, resolved_bucket),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate upload URL: {str(e)}",
        )


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
    settings = get_s3_settings()
    init_s3_bucket(settings.S3_BUCKET_NAME)
    init_s3_bucket(resolve_avatar_bucket())
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
    content_type: str | None = None,
    s3_client = Depends(get_s3_client)
):
    """
    Generates a presigned URL for uploading a file to S3.

    This endpoint creates a unique filename, constructs the S3 object key,
    and generates a temporary URL that allows the client to upload a file
    directly to the S3 bucket.

    Args:
        filename (str): The original filename (used to extract extension).
        content_type (str | None): Optional content type for the upload.
        s3_client: The S3 client injected by dependency.

    Returns:
        dict: Contains 'upload_url', 'file_key', and 'public_url'.
    """
    resolved_type = resolve_content_type(content_type)
    return create_presigned_upload(
        filename=filename,
        content_type=resolved_type,
        prefix="posters",
        s3_client=s3_client,
    )


@app.get("/api/avatar-upload-url")
def generate_avatar_upload_url(
    filename: str,
    user_id: Annotated[str, Depends(get_user_id)],
    s3_client = Depends(get_s3_client),
    content_type: str | None = None,
):
    """
    Generates a presigned URL for uploading a user avatar to S3.
    """
    resolved_type = resolve_content_type(content_type)
    return create_presigned_upload(
        filename=filename,
        content_type=resolved_type,
        prefix="",
        s3_client=s3_client,
        bucket_name=resolve_avatar_bucket(),
        object_name=str(user_id),
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
    
    public_poster_url = build_public_url(payload.file_key)

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
