"""
This module defines Pydantic schemas for mapping TMDB (The Movie Database) API responses.
It includes models for individual movie details, paginated lists of movies, and a 
dashboard view aggregating multiple movie categories.
"""

from typing import List, Optional

from pydantic import BaseModel


class TmdbMovie(BaseModel):
    """
    Represents a single movie object as returned by the TMDB API.
    """
    id: int
    original_language: str
    original_title: str
    overview: str
    # The path to the poster image on TMDB's servers (needs base URL to be a full link)
    poster_path: Optional[str] = None
    # Release date in YYYY-MM-DD format
    release_date: Optional[str] = None
    title: str
    # Average user rating (0-10)
    vote_average: float


class TmdbMovieList(BaseModel):
    """
    Represents a paginated list of movies returned by TMDB search or discovery endpoints.
    """
    page: int
    results: List[TmdbMovie]
    total_pages: int
    total_results: int


class MovieDashboard(BaseModel):
    """
    Aggregated view containing lists of movies for different categories.
    Used to populate the main dashboard of the application.
    """
    now_playing: List[TmdbMovie]
    popular: List[TmdbMovie]
    upcoming: List[TmdbMovie]
    top_rated: List[TmdbMovie]
