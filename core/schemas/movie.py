"""
This module defines Pydantic schemas for Movie-related operations.
It includes schemas for creating, updating, and retrieving movie data.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class MovieBase(BaseModel):
    """
    Base schema containing shared fields for Movie models.
    """

    # The title of the movie. Must be between 1 and 255 characters.
    title: str = Field(..., min_length=1, max_length=255)
    # A brief description of the movie. Optional, max 1000 characters.
    description: str | None = Field(None, max_length=1000)
    # The release date of the movie. Optional.
    release_date: date | None = None
    # URL to the movie poster. Optional, max 500 characters.
    poster_url: HttpUrl | None = Field(None, max_length=500)


class MovieCreate(MovieBase):
    """
    Schema for creating a new movie.
    Inherits all fields from MovieBase.
    """

    pass

class MovieUpdate(BaseModel):
    """
    Schema for updating an existing movie.
    All fields are optional, allowing for partial updates.
    """
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    release_date: date | None = None
    poster_url: str | None = Field(None, max_length=500)


class MovieResponse(MovieBase):
    """
    Schema for the movie response returned to the client.
    Includes the database ID and the ID of the user who created it.
    """

    id: int
    created_by_user_id: int

    # Configuration to enable Pydantic to read data from ORM models
    model_config = ConfigDict(from_attributes=True)
