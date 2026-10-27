import pytest
from fastapi.testclient import TestClient

from main import create_app


@pytest.fixture
def client():
    # speed 1000 replays an 18 s scenario in ~20 ms; the `with` keeps the event loop alive between requests.
    with TestClient(create_app(speed=1000)) as c:
        yield c
