from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from db.db import get_db
from src.dependencies import get_user_id
from src.main import app


@pytest.fixture
def mock_db_session():
    """Fixture to create a mock database session."""
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
    """Fixture to provide a mock user ID."""
    return 42

@pytest.fixture
def client(mock_db_session, mock_user_id):
    """
    Fixture to provide a TestClient with overridden dependencies.
    """
    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_user_id] = lambda: mock_user_id
    
    yield TestClient(app)
    
    app.dependency_overrides = {}

def test_create_movie_success(client, mock_db_session, mock_user_id):
    """
    Test the POST /movies/ endpoint for successful movie creation.
    """
    movie_data = {
        "title": "Inception",
        "description": "A dream within a dream.",
        "release_date": "2010-07-16",
        "poster_url": "https://example.com/inception.jpg"
    }

    response = client.post("/movies/", json=movie_data)

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

def test_get_movie_not_found(client, mock_db_session):
    """
    Test GET /movies/{movie_id} when the movie does not exist.
    """
    # Setup the mock to return None when querying for a movie
    mock_db_session.query.return_value.filter.return_value.first.return_value = None

    response = client.get("/movies/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Movie not found"}

def test_create_movie_validation_error(client):
    """
    Test POST /movies/ with invalid data to ensure validation errors are raised.
    """
    # Missing 'title' field which is required
    movie_data = {
        "description": "Missing title",
    }

    response = client.post("/movies/", json=movie_data)

    assert response.status_code == 422
