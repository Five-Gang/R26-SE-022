from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.detection_service import DetectionService

router = APIRouter()
detection_service = DetectionService()

class FrameRequest(BaseModel):
    image: str # Base64 encoded image

@router.post("/detect-emotion")
async def detect_emotion(request: FrameRequest):
    """
    Receives a base64 encoded image frame, runs the emotion detection pipeline,
    and returns the emotion, attention score, and extracted features.
    """
    if not request.image:
        raise HTTPException(status_code=400, detail="Image data is required")
        
    result = detection_service.process_frame(request.image)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result
