"""
This module defines dependencies used across the FastAPI application.
"""

from typing import Annotated

from fastapi import Header, HTTPException, status


async def get_user_id(x_user_id: Annotated[str | None, Header()] = None) -> str:
    """
    Dependency to retrieve the authenticated user's ID from the request headers.

    This dependency expects the API Gateway to have already authenticated the user
    and forwarded their ID via the 'X-User-Id' header.

    Args:
        x_user_id (str | None): The user ID extracted from the 'X-User-Id' header.

    Returns:
        str: The authenticated user's ID.

    Raises:
        HTTPException: 401 Unauthorized if the header is missing.
    """
    if x_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication header missing from Gateway.",
        )

    return x_user_id
