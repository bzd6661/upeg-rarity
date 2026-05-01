"""Shared pytest fixtures for pipeline tests."""
import pytest


@pytest.fixture
def sample_token_uri_json() -> str:
    """Canned tokenURI output for testing trait decoding.

    Replace with a real recorded value from Phase 0 once known.
    """
    return "data:application/json;base64,eyJuYW1lIjoiVXBlZyAjMSJ9"
