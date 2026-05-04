"""Shared pytest fixtures.

Discovery: pytest auto-loads conftest.py — no imports needed in test files.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Fresh TestClient per test. TestClient is a thin wrapper around httpx
    that drives the ASGI app in-process — no real network hop."""
    app = create_app()
    with TestClient(app) as c:
        yield c
