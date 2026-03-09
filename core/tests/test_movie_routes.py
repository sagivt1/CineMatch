"""
Movie Routes Test Module.

This module contains unit tests for the movie-related API endpoints.
It uses `unittest.mock` and `pytest` fixtures to isolate the tests from
external dependencies like the database and RabbitMQ.
"""
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

from db.db import get_db
from src.dependencies import get_user_id
from src.main import app
from services.s3.s3_service import get_s3_client


@pytest.fixture
def mock_db_session():
    """
    Fixture to create a mock database session.
    
    It mocks the `refresh` method to simulate the database assigning an ID.
    """
    session = MagicMock()
    
    # Define behavior for db.refresh: it should simulate the DB assigning an ID
    # because the actual DB is not running to auto-increment the ID.
    def refresh_side_effect(instance):
        instance.id = 1
        return None
    
    session.refresh.side_effect = refresh_side_effect
    return session

@pytest.fixture
def mock_user_id():
    """
    Fixture to provide a mock user ID.
    Simulates an authenticated user with ID 42.
    """
    return 42

@pytest.fixture
def client(mock_db_session, mock_user_id):
    """
    Fixture to provide a TestClient with overridden dependencies.
    
    It overrides `get_db` to return the mock session and `get_user_id`
    to return the mock user ID, ensuring tests run without a real DB or auth.
    """
    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_user_id] = lambda: mock_user_id
    
    yield TestClient(app)
    
    # Clean up overrides after the test
    app.dependency_overrides = {}

@patch("src.main.publish_movie_event", new_callable=AsyncMock)
def test_create_movie_success(mock_publish_event, client, mock_db_session, mock_user_id):
    """
    Test the POST /api/movie/ endpoint for successful movie creation.
    
    Verifies that:
    1. The endpoint returns 201 Created.
    2. The response body contains the correct movie data and assigned ID.
    3. The database session methods (add, commit, refresh) are called.
    4. The RabbitMQ publish event is triggered with the correct payload.
    """
    movie_data = {
        "title": "Inception",
        "description": "A dream within a dream.",
        "release_date": "2010-07-16",
        "poster_url": "https://example.com/inception.jpg"
    }

    response = client.post("/api/movie/", json=movie_data)

    assert response.status_code == 201
    response_json = response.json()
    
    # Check if the response matches the input and mocked data
    assert response_json["title"] == movie_data["title"]
    assert response_json["id"] == 1
    assert response_json["created_by_user_id"] == mock_user_id

    # Verify DB interactions
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()

    # Verify that the event was published to RabbitMQ
    mock_publish_event.assert_called_once()

    # Check arguments passed to the publish function
    called_args, called_kwargs = mock_publish_event.call_args
    assert called_args[0] == "created"
    assert called_args[1]["id"] == 1

def test_get_movie_not_found(client, mock_db_session):
    """
    Test GET /api/movies/{movie_id} when the movie does not exist.
    
    Verifies that the endpoint returns 404 Not Found when the database
    query returns None.
    """
    # Setup the mock to return None when querying for a movie
    # db.query(Movie).filter(...).first() -> None
    mock_db_session.query.return_value.filter.return_value.first.return_value = None

    response = client.get("/api/movies/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Movie not found"}

def test_create_movie_validation_error(client):
    """
    Test POST /api/movie/ with invalid data to ensure validation errors are raised.
    
    Verifies that Pydantic validation catches missing required fields (title)
    and returns 422 Unprocessable Entity.
    """
    # Missing 'title' field which is required
    movie_data = {
        "description": "Missing title",
    }

    response = client.post("/api/movie/", json=movie_data)

    assert response.status_code == 422

def test_generate_presigned_url_success(client):
    """
    Test GET /api/upload-url to ensure it generates a valid presigned URL.

    Verifies that:
    1. The endpoint returns 200 OK.
    2. The response contains a 'file_key' with the correct folder and extension.
    3. The S3 client's generate_presigned_url method is called.
    """
    # Create a mock S3 client
    mock_s3_client = MagicMock()
    
    # Configure the mock to return a fake URL
    mock_s3_client.generate_presigned_url.return_value = "https://mock-s3-url.com/fake-presigned-link"

    # Override the dependency to use the mock client
    app.dependency_overrides[get_s3_client] = lambda: mock_s3_client

    try:
        # Call the endpoint with a filename query parameter
        response = client.get("/api/upload-url?filename=batman_poster.jpg")

        assert response.status_code == 200

        response_json = response.json()

        # Verify the file key structure (folder/uuid.extension)
        assert response_json["file_key"].startswith("posters/")
        assert response_json["file_key"].endswith("jpg")

        # Verify the S3 interaction
        mock_s3_client.generate_presigned_url.assert_called_once()

    finally:
        # Clean up overrides to avoid affecting other tests
        app.dependency_overrides.clear()

    
