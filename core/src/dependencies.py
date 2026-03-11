"""
This module defines dependencies used across the FastAPI application.
"""

from typing import Annotated

from fastapi import Header, HTTPException, status


async def get_user_id(
    user_id: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str:
    """
    Dependency to retrieve the authenticated user's ID from the request headers.

    Args:
        user_id (int | None): The user ID extracted from the 'user-id' header.
                              FastAPI automatically converts the header value to an integer.

    Returns:
        int: The user ID if present.

    Raises:
        HTTPException: If the 'user-id' header is missing (401 Unauthorized).
    """
    resolved_user_id = x_user_id or user_id

    if resolved_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User-Id header missing. User identification required.",
        )

    return resolved_user_id
