from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_student_id
from app.db.mongo import get_db

router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@router.get("")
async def get_materials(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    items = await db.review_items.find({"student_id": student_id}).sort("created_at", -1).to_list(None)
    return {
        "materials": [
            {
                "id": str(item.get("_id")),
                "name": item.get("title", item.get("item_key", "Untitled material")),
                "subject": item.get("topic", "General study"),
                "date": item.get("created_at"),
                "status": "Processed",
                "type": item.get("content_type", "Study item"),
            }
            for item in items
        ],
        "count": len(items),
    }
