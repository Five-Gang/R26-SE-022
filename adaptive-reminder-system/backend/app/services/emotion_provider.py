from abc import ABC, abstractmethod
from app.core.config import settings
from app.models.learning_context import ActivityType, LearningSignal, signal_from_payload
from app.services.signal_control import signal_control_store
import csv
import httpx

class EmotionProvider(ABC):
    @abstractmethod
    async def read(self, student_id: str) -> LearningSignal:
        """Return study-context-aware affective signals for the scheduler."""
        pass

class MockProvider(EmotionProvider):
    """Default dev provider: active study session with neutral-positive cues."""
    async def read(self, student_id: str) -> LearningSignal:
        return signal_from_payload(
            {
                "valence": 0.3,
                "arousal": 0.55,
                "attention": 0.78,
                "activity_type": "QUIZ",
                "session_active": True,
                "content_in_focus": True,
                "blink_rate": 14.0,
                "fatigue": 0.2,
                "head_tilt_degrees": 6.0,
                "confidence": 0.9,
            },
            source="mock",
            default_activity=ActivityType.QUIZ,
            default_session_active=True,
            default_content_in_focus=True,
        )

class ReplayProvider(EmotionProvider):
    """Load replay rows and enrich them with a study activity context."""
    def __init__(self):
        self.data = []
        self._load_csv()
        self.idx = 0

    def _load_csv(self) -> None:
        try:
            with open(settings.REPLAY_CSV) as f:
                for row in csv.DictReader(f):
                    self.data.append(row)
        except FileNotFoundError:
            pass

    async def read(self, student_id: str) -> LearningSignal:
        if not self.data:
            return await MockProvider().read(student_id)
        result = self.data[self.idx % len(self.data)]
        self.idx += 1
        return signal_from_payload(
            result,
            source="replay",
            default_activity=ActivityType.LECTURE,
            default_session_active=True,
            default_content_in_focus=True,
        )

class HttpProvider(EmotionProvider):
    """Call Mihiraj's service and parse activity plus cue-level signals when present."""
    async def read(self, student_id: str) -> LearningSignal:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.EMOTION_SERVICE_URL}/predict/{student_id}",
                    timeout=5.0,
                )
                if resp.status_code == 200:
                    return signal_from_payload(
                        resp.json(),
                        source="http",
                        default_activity=ActivityType.UNKNOWN,
                        default_session_active=False,
                        default_content_in_focus=False,
                    )
        except Exception:
            pass
        return signal_from_payload(
            {},
            source="http-fallback",
            default_activity=ActivityType.UNKNOWN,
            default_session_active=False,
            default_content_in_focus=False,
        )


class ControlledEmotionProvider(EmotionProvider):
    """Allow manual overrides to replace the underlying provider during development."""

    def __init__(self, inner: EmotionProvider):
        self.inner = inner

    async def read(self, student_id: str) -> LearningSignal:
        override = signal_control_store.get_override_signal(student_id)
        if override is not None:
            return override
        return await self.inner.read(student_id)

def create_emotion_provider() -> EmotionProvider:
    if settings.EMOTION_PROVIDER == "replay":
        provider: EmotionProvider = ReplayProvider()
    elif settings.EMOTION_PROVIDER == "http":
        provider = HttpProvider()
    else:
        provider = MockProvider()
    return ControlledEmotionProvider(provider)
