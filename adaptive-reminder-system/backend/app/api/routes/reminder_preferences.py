from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_student_id
from app.db.mongo import get_db
from app.schemas.schemas import SettingsUpdate

router = APIRouter(prefix="/api/v1/reminder-preferences", tags=["reminder-preferences"])

DEFAULT_SETTINGS = {
    "reminder_frequency": 60,
    "activity_mix": {"ACTIVE": 0.5, "GUIDED": 0.3, "PASSIVE": 0.2},
    "quiet_hours_start": 22,
    "quiet_hours_end": 8,
}


def settings_from_student(student):
    quiet_hours = student.get("quiet_hours", {})
    return {
        "reminder_frequency": student.get("reminder_frequency", DEFAULT_SETTINGS["reminder_frequency"]),
        "activity_mix": student.get("activity_mix", DEFAULT_SETTINGS["activity_mix"]),
        "quiet_hours_start": quiet_hours.get("start", DEFAULT_SETTINGS["quiet_hours_start"]),
        "quiet_hours_end": quiet_hours.get("end", DEFAULT_SETTINGS["quiet_hours_end"]),
    }


@router.get("", response_model=SettingsUpdate)
async def get_reminder_preferences(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    student = await db.students.find_one({"_id": student_id}, {"_id": 0}) or {}
    return settings_from_student(student)


@router.put("", response_model=SettingsUpdate)
async def update_reminder_preferences(
    preferences: SettingsUpdate,
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    values = preferences.model_dump()
    await db.students.update_one(
        {"_id": student_id},
        {
            "$set": {
                "reminder_frequency": values["reminder_frequency"],
                "activity_mix": values["activity_mix"],
                "quiet_hours": {
                    "start": values["quiet_hours_start"],
                    "end": values["quiet_hours_end"],
                },
            }
        },
    )
    return values
