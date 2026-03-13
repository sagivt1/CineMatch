"""
This module defines Pydantic schemas for mapping TMDB (The Movie Database) API responses.
It includes models for individual movie details, paginated lists of movies, and a 
dashboard view aggregating multiple movie categories.
"""

from typing import List, Optional

from pydantic import BaseModel

from .review import ReviewRead


class TmdbMovie(BaseModel):
    """
    Represents a single movie object as returned by the TMDB API.
    """
    # Unique TMDB identifier
    id: int
    # ISO 639-1 language code (e.g., "en")
    original_language: str
    # Original title in the source language
    original_title: str
    # Short plot summary
    overview: str
    # The path to the poster image on TMDB's servers (needs base URL to be a full link)
    poster_path: Optional[str] = None
    # Release date in YYYY-MM-DD format
    release_date: Optional[str] = None
    # English (or requested language) title
    title: str
    # Average user rating (0-10)
    vote_average: float


class TmdbMovieList(BaseModel):
    """
    Represents a paginated list of movies returned by TMDB search or discovery endpoints.
    """
    # Current page number
    page: int
    # List of movies on the current page
    results: List[TmdbMovie]
    # Total number of pages available
    total_pages: int
    # Total number of results across all pages
    total_results: int


class MovieDashboard(BaseModel):
    """
    Aggregated view containing lists of movies for different categories.
    Used to populate the main dashboard of the application.
    """
    # Movies currently in theaters
    now_playing: List[TmdbMovie]
    # Movies trending now
    popular: List[TmdbMovie]
    # Movies coming soon
    upcoming: List[TmdbMovie]
    # Highest rated movies of all time
    top_rated: List[TmdbMovie]
    # Error indicator for each list
    errors: List[str] = []

class MovieDetailWithReviews(TmdbMovie):
    """
    Extended movie schema that includes a list of user reviews.
    Used when fetching detailed information for a specific movie.
    """
    # List of reviews associated with this movie from the local database
    reviews: List[ReviewRead] = []
