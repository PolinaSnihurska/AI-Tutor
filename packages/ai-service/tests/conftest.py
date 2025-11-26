"""Pytest configuration and fixtures."""
import os
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Set test environment variables before importing app
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "test-key")
os.environ["REDIS_URL"] = os.getenv("REDIS_URL", "redis://:redis@localhost:6379")
os.environ["NODE_ENV"] = "test"

from app.main import app


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_explanation_request():
    """Sample explanation request data."""
    return {
        "topic": "Pythagorean theorem",
        "subject": "Mathematics",
        "student_level": 8,
        "context": None,
        "previous_explanations": []
    }


@pytest.fixture
def sample_simple_request():
    """Simple explanation request for quick tests."""
    return {
        "topic": "Addition",
        "subject": "Mathematics",
        "student_level": 2,
        "context": None,
        "previous_explanations": []
    }
