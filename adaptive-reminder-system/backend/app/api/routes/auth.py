from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.api.deps import get_current_student_id
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.schemas import LoginRequest, SignupRequest, TokenResponse
import uuid

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
async def signup(req: SignupRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    # Check if email already exists
    existing = await db.students.find_one({"email": req.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new student
    student_id = str(uuid.uuid4())
    student_doc = {
        "_id": student_id,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "consent_at": None,
        "quiet_hours": {"start": 22, "end": 8},
        "reminder_frequency": 60,
        "activity_mix": {"ACTIVE": 0.5, "GUIDED": 0.3, "PASSIVE": 0.2},
        "timezone": "UTC",
        "created_at": datetime.utcnow(),
    }
    await db.students.insert_one(student_doc)
    
    token = create_access_token(student_id)
    return TokenResponse(access_token=token)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    student = await db.students.find_one({"email": req.email})
    if not student or not verify_password(req.password, student["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    token = create_access_token(student["_id"])
    return TokenResponse(access_token=token)


@router.get("/me")
async def get_current_student(
    student_id: str = Depends(get_current_student_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    student = await db.students.find_one({"_id": student_id}, {"password_hash": 0})
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return {
        "student_id": student["_id"],
        "name": student.get("name", "Student"),
        "email": student["email"],
    }

from datetime import datetime
