from datetime import datetime

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .base import Base


class Review(Base):
    """
    Represents a user review for a movie.
    """

    __tablename__ = "reviews"

    # Unique identifier for the review
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Standard Foreign Key linking to the local Users table
    # Note: Ensure the 'users' table exists in the same database or remove ForeignKey if strictly microservices
    user_id: Mapped[int] = mapped_column(index=True, nullable=False)

    # LOGICAL Foreign Key linking to TMDB (No ForeignKey constraint, just indexed)
    tmdb_id: Mapped[int] = mapped_column(index=True, nullable=False)

    # The numeric rating given by the user
    rating: Mapped[int] = mapped_column(index=True, nullable=False)

    # The text content of the review
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Timestamp when the review was created; automatically set by the server
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Ensure a user can only review a specific movie once
    __table_args__ = (
        Index("idx_user_movie_review", "user_id", "tmdb_id", unique=True),
    )