from datetime import datetime

from sqlalchemy import Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .base import Base


class Review(Base):
    """
    Represents a user review for a movie.

    This model stores the rating and text content submitted by a user for a specific
    movie identified by its TMDB ID. It includes a unique constraint to ensure
    that a user can only submit one review per movie.
    """

    __tablename__ = "reviews"

    # Unique identifier for this review record
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # The UUID of the user who created the review.
    # This serves as a logical reference to the User entity (managed by the Auth/Gateway service).
    user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), index=True, nullable=False)

    # The external movie ID from The Movie Database (TMDB).
    # This is a logical reference to the external API and does not enforce a database constraint.
    tmdb_id: Mapped[int] = mapped_column(index=True, nullable=False)

    # The numeric rating given by the user (typically 1-10)
    rating: Mapped[int] = mapped_column(index=True, nullable=False)

    # The textual content of the review
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Timestamp of when the review was created.
    # Defaults to the current server time upon insertion.
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Constraint to prevent a user from reviewing the same movie more than once
    __table_args__ = (
        Index("idx_user_movie_review", "user_id", "tmdb_id", unique=True),
    )