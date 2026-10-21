from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.mongo import get_db
from app.models.learning_context import ActivityType
from app.services.scheduler import preview_scheduling_state, run_scheduling_tick
from app.services.signal_control import signal_control_store

router = APIRouter(prefix="/api/v1/dev", tags=["dev"])


class ManualSignalOverrideRequest(BaseModel):
    valence: float = Field(0.3, ge=-1.0, le=1.0)
    arousal: float = Field(0.55, ge=0.0, le=1.0)
    attention: float = Field(0.78, ge=0.0, le=1.0)
    activity_type: str = "QUIZ"
    session_active: bool = True
    content_in_focus: bool = True
    blink_rate: float = Field(14.0, ge=0.0, le=80.0)
    fatigue: float = Field(0.2, ge=0.0, le=1.0)
    head_tilt_degrees: float = Field(6.0, ge=-90.0, le=90.0)
    confidence: float = Field(1.0, ge=0.0, le=1.0)


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "env": settings.ENV,
        "emotion_provider": settings.EMOTION_PROVIDER,
    }


@router.get("/config")
async def get_config():
    """Get current config (for testing only)."""
    return {
        "mongodb_db": settings.MONGODB_DB,
        "env": settings.ENV,
        "emotion_provider": settings.EMOTION_PROVIDER,
    }


@router.get("/students")
async def get_students(db: AsyncIOMotorDatabase = Depends(get_db)):
    """List available students for the signal lab UI."""
    students = await db.students.find({}, {"email": 1, "name": 1}).to_list(None)
    return {
        "students": [
            {
                "student_id": str(student["_id"]),
                "email": student.get("email"),
                "name": student.get("name"),
            }
            for student in students
        ]
    }


@router.get("/signal-control/options")
async def get_signal_control_options():
    """Metadata used by the signal lab form."""
    return {
        "activity_types": [activity.value for activity in ActivityType],
        "defaults": ManualSignalOverrideRequest().model_dump(),
    }


@router.get("/signal-control/{student_id}")
async def get_signal_override(student_id: str):
    """Get the currently configured manual override for a student."""
    override_payload = signal_control_store.get_override_payload(student_id)
    override_signal = signal_control_store.get_override_signal(student_id)
    return {
        "student_id": student_id,
        "override_active": override_payload is not None,
        "override_payload": override_payload,
        "override_signal": (
            {
                "source": override_signal.source,
                "valence": override_signal.valence,
                "arousal": override_signal.arousal,
                "attention": override_signal.attention,
                "activity_type": override_signal.activity_type.value,
                "session_active": override_signal.session_active,
                "content_in_focus": override_signal.content_in_focus,
                "blink_rate": override_signal.blink_rate,
                "fatigue": override_signal.fatigue,
                "head_tilt_degrees": override_signal.head_tilt_degrees,
                "signal_confidence": override_signal.signal_confidence,
            }
            if override_signal is not None
            else None
        ),
    }


@router.post("/signal-control/{student_id}")
async def set_signal_override(
    student_id: str,
    body: ManualSignalOverrideRequest,
):
    """Set a manual Mihiraj-style signal payload for a student."""
    signal = signal_control_store.set_override(student_id, body.model_dump())
    return {
        "status": "ok",
        "student_id": student_id,
        "override_active": True,
        "signal": {
            "source": signal.source,
            "valence": signal.valence,
            "arousal": signal.arousal,
            "attention": signal.attention,
            "activity_type": signal.activity_type.value,
            "session_active": signal.session_active,
            "content_in_focus": signal.content_in_focus,
            "blink_rate": signal.blink_rate,
            "fatigue": signal.fatigue,
            "head_tilt_degrees": signal.head_tilt_degrees,
            "signal_confidence": signal.signal_confidence,
        },
    }


@router.delete("/signal-control/{student_id}")
async def clear_signal_override(student_id: str):
    """Remove any manual override so the real provider path is used again."""
    signal_control_store.clear_override(student_id)
    return {
        "status": "ok",
        "student_id": student_id,
        "override_active": False,
    }


@router.get("/signal-control/{student_id}/preview")
async def preview_signal_outputs(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Preview readiness, bandit, and scheduling outputs for the current signal state."""
    return await preview_scheduling_state(student_id, db)


@router.post("/signal-control/{student_id}/tick")
async def trigger_signal_control_tick(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run the scheduler once without going through the authenticated frontend flow."""
    return await run_scheduling_tick(student_id, db)
