"""MongoDB persistence helpers for per-student reminder policies."""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.bandit import BanditValidationError, LinUCB


async def load_student_bandit(
    db: AsyncIOMotorDatabase, student_id: str
) -> LinUCB:
    document = await db.bandit_policies.find_one({"student_id": student_id})
    if document is None:
        return LinUCB()
    try:
        return LinUCB.from_dict(document["state"])
    except (KeyError, BanditValidationError):
        # Feature semantics changed when elapsed time was normalized. Start
        # a fresh policy rather than applying old statistics to new contexts.
        return LinUCB()


async def save_student_bandit(
    db: AsyncIOMotorDatabase, student_id: str, model: LinUCB
) -> None:
    await db.bandit_policies.update_one(
        {"student_id": student_id},
        {"$set": {"student_id": student_id, "state": model.to_dict()}},
        upsert=True,
    )


def feedback_reward(status: str) -> float:
    rewards = {"ACCEPTED": 1.0, "SNOOZED": 0.0, "DISMISSED": -1.0}
    try:
        return rewards[status]
    except KeyError as exc:
        raise ValueError(f"Unsupported reminder feedback status: {status}") from exc
