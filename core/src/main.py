"""
This module is the main entry point for the Core FastAPI application.
It defines the FastAPI app instance, lifespan events, and API endpoints for
managing movies.
"""

from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status

from sqlalchemy.orm import Session

from models.movie import Movie
from schemas.movie import MovieCreate, MovieResponse
from .dependencies import get_user_id
from db.db import get_db, init_db



@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    An asynchronous context manager to handle application startup and shutdown events.
    It prints a message when the application starts and when it shuts down.
    """
    print("[Core] Start FastApi")
    init_db()
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
