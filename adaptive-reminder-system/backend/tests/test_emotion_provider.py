import pytest

from app.services.emotion_provider import HttpProvider


class FailedResponse:
    status_code = 503


class FailedClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, *_args, **_kwargs):
        return FailedResponse()


@pytest.mark.asyncio
async def test_http_emotion_provider_uses_safe_fallback(monkeypatch):
    monkeypatch.setattr(
        "app.services.emotion_provider.httpx.AsyncClient",
        lambda: FailedClient(),
    )

    signal = await HttpProvider().read("student-1")

    assert signal.source == "http-fallback"
    assert signal.session_active is False
    assert signal.content_in_focus is False
