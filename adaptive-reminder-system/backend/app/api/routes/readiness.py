from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.predict_readiness import (
    predict_readiness,
    get_time_of_day,
    prediction_source,
    allowed_emotions,
    allowed_times,
)

router = APIRouter()


class ReadinessRequest(BaseModel):
    emotion: str
    time_of_day: str | None = None


@router.post("/api/v1/predict/readiness")
def predict(req: ReadinessRequest):
    try:
        time_of_day = req.time_of_day or get_time_of_day()
        readiness = predict_readiness(req.emotion, time_of_day)

        return {
            "emotion": req.emotion,
            "time_of_day": time_of_day,
            "predicted_readiness": readiness,
            "source": prediction_source(),
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        # encoding error (unknown category)
        raise HTTPException(
            status_code=400,
            detail={
                "message": str(e),
                "allowed_emotions": allowed_emotions(),
                "allowed_times": allowed_times(),
            },
        )
