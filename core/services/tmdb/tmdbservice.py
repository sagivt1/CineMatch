"""
TMDB Service Module.

This module provides a service layer for interacting with The Movie Database (TMDB) API.
It abstracts the details of making HTTP requests and handling responses, offering
a clean interface for fetching movie data like popular, upcoming, and top-rated lists,
as well as detailed information for specific movies.
"""

from typing import Any, Dict, Optional

import httpx

# import setting from tmdb/config
from .config import get_tmdb_settings


def get_tmdb_client() -> httpx.AsyncClient:
    """
    Creates and configures an httpx.AsyncClient for TMDB API requests.

    This factory function retrieves API settings (base URL, access token) and
    initializes an asynchronous HTTP client with the necessary authorization
    headers and a request timeout.

    Returns:
        httpx.AsyncClient: A configured client instance ready for making API calls.
    """
    setting = get_tmdb_settings()

    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {setting.TMDB_READ_ACCESS_TOKEN}",
    }

    return httpx.AsyncClient(base_url=setting.TMDB_BASE_URL, headers=headers, timeout=10.0)


async def _fetch_movie_list(category: str, page: int) -> Optional[Dict[str, Any]]:
    """
    Internal helper function to fetch a list of movies for a given category.

    Args:
        category (str): The movie category to fetch (e.g., "now_playing", "popular").
        page (int): The page number of the results to retrieve.

    Returns:
        An optional dictionary containing the API response data on success,
        or None if an HTTP error occurs.
    """
    setting = get_tmdb_settings()

    # Use an async context manager to ensure the client is properly closed.
    async with get_tmdb_client() as client:
        try:
            response = await client.get(
                f"movie/{category}",
                params={
                    "language": setting.TMDB_LANGUAGE,
                    "page": page,
                }
            )
            # Raise an exception for 4xx or 5xx status codes.
            response.raise_for_status()
            return response.json()

        except httpx.HTTPError as e:
            # In a production environment, use a structured logger instead of print.
            print(f"[TMDB] HTTP error while fetching '{category}' movies: {e}", flush=True)
            return None


# --- Public API Functions for Routers ---


async def get_now_playing_movies(page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetches a list of movies currently playing in theaters from TMDB."""
    return await _fetch_movie_list("now_playing", page)


async def get_popular_movies(page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetches a list of the current popular movies from TMDB."""
    return await _fetch_movie_list("popular", page)


async def get_upcoming_movies(page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetches a list of upcoming movies being released soon from TMDB."""
    return await _fetch_movie_list("upcoming", page)


async def get_top_rated_movies(page: int = 1) -> Optional[Dict[str, Any]]:
    """Fetches a list of the all-time top-rated movies from TMDB."""
    return await _fetch_movie_list("top_rated", page)


async def get_movie_details(tmdb_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetches detailed information for a specific movie from TMDB.

    Args:
        tmdb_id (int): The unique The Movie Database identifier for the movie.

    Returns:
        An optional dictionary containing the detailed movie data on success,
        or None if an HTTP error occurs.
    """
    setting = get_tmdb_settings()

    async with get_tmdb_client() as client:
        try:
            response = await client.get(
                f"movie/{tmdb_id}",
                params={"language": setting.TMDB_LANGUAGE},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            # In a production environment, use a structured logger instead of print.
            print(f"[TMDB] HTTP error while fetching details for {tmdb_id}: {e}", flush=True)
            return None