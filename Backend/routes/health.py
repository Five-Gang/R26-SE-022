from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Basic health check endpoint to verify backend is running.
    """
    return {
        "status": "ok",
        "service": "Affect and Attention-Aware Emotion Detection Module",
        "version": "1.0.0"
    }
