from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal

# === Auth ===
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# === Review Items ===
class ReviewItemResponse(BaseModel):
    item_key: str
    topic: str
    title: str
    repetitions: int
    interval_days: float
    easiness: float
    difficulty: float
    retention_probability: float
    review_priority: float
    last_reviewed: datetime | None

class ReviewItemListResponse(BaseModel):
    items: list[ReviewItemResponse]

# === Reminders ===
class ReminderFeedback(BaseModel):
    status: Literal["ACCEPTED", "SNOOZED", "DISMISSED"]
    grade: int = Field(0, ge=0, le=5)

class ReminderGenerateRequest(BaseModel):
    emotion: str
    topic_id: str
    time_of_day: str | None = None

class ScheduleTickRequest(BaseModel):
    emotion: str = "Focused"
    time_of_day: str | None = None
    topic_id: str | None = None

class ReminderResponse(BaseModel):
    reminder_id: str
    item_key: str
    item_title: str
    content_type: str
    readiness_tier: str
    readiness_score: float
    retention_probability: float
    bandit_action: str
    activity_type: str | None = None
    engagement_score: float | None = None
    decision_reason: str | None = None
    status: str
    scheduled_at: datetime
    sent_at: datetime | None
    responded_at: datetime | None

class ReminderQueueResponse(BaseModel):
    reminders: list[ReminderResponse]
    count: int

# === Dashboard Stats ===
class DashboardStatsResponse(BaseModel):
    total_items: int
    retention_avg: float
    streak_days: int
    readiness_score: float
    readiness_tier: str

# === Settings ===
class SettingsUpdate(BaseModel):
    reminder_frequency: int = Field(60, ge=30, le=240)       # minutes
    activity_mix: dict = Field({"ACTIVE": 0.5, "GUIDED": 0.3, "PASSIVE": 0.2})
    quiet_hours_start: int = Field(22, ge=0, le=23)           # hour
    quiet_hours_end: int = Field(8, ge=0, le=23)              # hour

# === Push Subscription ===
class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}

# === Schedule Tick (internal) ===
class ScheduleTickResponse(BaseModel):
    student_id: str
    reminders_created: int
    items_processed: int
    status: str
    decision: str | None = None
    decision_reason: str | None = None
    activity_type: str | None = None
    session_active: bool | None = None
    engagement_score: float | None = None
    readiness_score: float | None = None
    readiness_tier: str | None = None
    content_type: str | None = None
