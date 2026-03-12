"""
Movie Router Module.

This module defines the API endpoints for movie-related operations, including
fetching movie lists (popular, upcoming, etc.), retrieving movie details,
and managing user reviews.
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.db import get_db
from .dependencies import get_user_id
from models.review import Review
from schemas.review import ReviewCreate
from schemas.tmdbmovie import MovieDashboard, MovieDetailWithReviews, TmdbMovieList
from services.tmdb.tmdbservice import get_movie_details, get_now_playing_movies, get_popular_movies, get_top_rated_movies, get_upcoming_movies

router = APIRouter(
    prefix="/api/movies",
    tags=["movies & reviews"],
    responses={404: {"description": "Not found"}},
)


@router.post("/review/", status_code=status.HTTP_201_CREATED)
async def add_review(
    payload: ReviewCreate,
    user_id: Annotated[str, Depends(get_user_id)], 
    db: AsyncSession = Depends(get_db)):
    """
    Submits a new user review for a specific movie.
    
    Expects a JSON payload with the movie ID, rating, and content.
    The user ID is extracted from the request headers.
    """

    # Create the review instance from the payload and user ID
    new_review = Review(
        tmdb_id=payload.tmdb_id,
        user_id=int(user_id),
        rating=payload.rating,
        content=payload.content
    ) 

    db.add(new_review)
    try:
        # Commit to save the review to the database
        await db.commit()
        # Refresh the instance to get generated fields (like id and created_at)
        await db.refresh(new_review)
        return new_review
    except Exception:
        # Rollback in case of error (e.g., UniqueConstraint violation if user already reviewed this movie)
        # Ideally, catch sqlalchemy.exc.IntegrityError specifically here.
        await db.rollback()
        raise HTTPException(status_code=400, detail="You have already reviewed this movie.")
    

@router.get("/dashboard/", response_model=MovieDashboard)
async def get_movie_dashboard():
    """
    Aggregates lists of movies (Now Playing, Popular, Upcoming, Top Rated) for the dashboard.
    
    Requests are made concurrently to TMDB to minimize loading time.
    """

    # Execute all 4 API calls in parallel using asyncio.gather
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
    
    # Map results to the Dashboard schema
    return MovieDashboard(
        now_playing=get_results(results[0]),
        popular=get_results(results[1]),
        upcoming=get_results(results[2]),
        top_rated=get_results(results[3])
    )


@router.get("/popular/", response_model=TmdbMovieList)
async def get_popular(page: int = Query(1, ge=1)):
    """Fetches a paginated list of popular movies."""
    data = await get_popular_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data


@router.get("/now-playing/", response_model=TmdbMovieList)
async def now_playing(page: int = Query(1, ge=1)):
    """Fetches a paginated list of movies currently in theaters."""
    data = await get_now_playing_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data


@router.get("/upcoming/", response_model=TmdbMovieList)
async def upcoming(page: int = Query(1, ge=1)):
    """Fetches a paginated list of upcoming movies."""
    data = await get_upcoming_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data


@router.get("/top-rated/", response_model=TmdbMovieList)
async def top_rated(page: int = Query(1, ge=1)):
    """Fetches a paginated list of top-rated movies."""
    data = await get_top_rated_movies(page=page)
    if not data:
        raise HTTPException(status_code=502, detail="TMDB unreachable")
    return data


@router.get("/{tmdb_id}/", response_model=MovieDetailWithReviews)
async def get_movie_page(tmdb_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetches detailed information for a movie along with its most recent reviews.
    
    Performs a concurrent fetch:
    1. Calls TMDB API for movie metadata.
    2. Queries local database for recent reviews.
    """
    # Prepare the async tasks
    tmdb_task = get_movie_details(tmdb_id)

    # Fetch the last 10 reviews, newest first
    query = select(Review).where(Review.tmdb_id == tmdb_id).order_by(Review.created_at.desc()).limit(10)
    db_task = db.execute(query)

    try:
        # Run both tasks concurrently to reduce total latency
        movie_data, db_result = await asyncio.gather(
            tmdb_task,
            db_task,
        )
    except TypeError as e:
        # This will tell us EXACTLY which one is not an awaitable
        print(f"Gather failed. TMDB Coro: {tmdb_task}, DB Coro: {db_task}")
        raise e

    if not movie_data:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Combine TMDB data with the list of review objects
    return {
        **movie_data,
        "reviews": db_result.scalars().all()
    }