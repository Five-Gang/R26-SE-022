from pathlib import Path
from datetime import datetime
import pickle
import pandas as pd
from app.models.readiness_fusion import ReadinessTier


BACKEND_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = BACKEND_ROOT / "models"
ARTIFACT_DIR = BACKEND_ROOT / "app" / "artifacts"


# NOTE: Models were trained using five emotion labels only.
# Keep this mapping limited to those five to match training labels used by the readiness model.
EMOTION_HAPPINESS = {
    "focused": 0.85,
    "neutral": 0.55,
    "frustrated": 0.28,
    "bored": 0.22,
    "confused": 0.40,
}

TIME_NORMALIZED = {
    "morning": 10 / 23.0,
    "afternoon": 14 / 23.0,
    "evening": 19 / 23.0,
    "night": 22 / 23.0,
}


def get_time_of_day():
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    else:
        return "Night"


def _load_pickle(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Missing model file: {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def _load_label_bundle():
    """Load the encoder-based bundle if the four requested pkl files exist."""
    readiness_model = _load_pickle(MODEL_DIR / "readiness_model.pkl")
    emotion_encoder = _load_pickle(MODEL_DIR / "emotion_encoder.pkl")
    time_encoder = _load_pickle(MODEL_DIR / "time_encoder.pkl")
    readiness_encoder = _load_pickle(MODEL_DIR / "readiness_encoder.pkl")
    return {
        "kind": "encoder_bundle",
        "model": readiness_model,
        "emotion_encoder": emotion_encoder,
        "time_encoder": time_encoder,
        "readiness_encoder": readiness_encoder,
    }


def _load_artifact_bundle():
    """Load the existing trained artifact from app/artifacts/readiness_model.pkl."""
    artifact = _load_pickle(ARTIFACT_DIR / "readiness_model.pkl")
    if isinstance(artifact, dict) and "model" in artifact and "scaler" in artifact:
        return {
            "kind": "artifact_model",
            "model": artifact["model"],
            "scaler": artifact["scaler"],
            "readiness_levels": artifact.get("readiness_levels", ["HIGH", "MEDIUM", "LOW"]),
        }
    raise ValueError("Unsupported readiness artifact format")


def load_models():
    """Load either the requested encoder bundle or the existing artifact bundle."""
    try:
        return _load_label_bundle()
    except FileNotFoundError:
        return _load_artifact_bundle()


# Load once at import time (will raise clearly if files are missing)
try:
    MODEL_BUNDLE = load_models()
except Exception as exc:  # keep import-time error informative
    MODEL_BUNDLE = None
    _LOAD_ERROR = exc
else:
    _LOAD_ERROR = None


def _emotion_happiness(emotion: str) -> float:
    return EMOTION_HAPPINESS.get(emotion.strip().lower(), 0.5)


def _time_to_normalized(time_of_day: str) -> float:
    return TIME_NORMALIZED.get(time_of_day.strip().lower(), 14 / 23.0)


def _build_features(emotion: str, time_of_day: str) -> list[float]:
    emotion_score = _emotion_happiness(emotion)
    time_score = _time_to_normalized(time_of_day)

    sleep_quality = max(0.1, min(1.0, 0.55 + (emotion_score - 0.5) * 0.45))
    recent_performance = max(0.1, min(1.0, 0.58 + (emotion_score - 0.5) * 0.35))
    energy_level = max(0.1, min(1.0, 0.60 + (emotion_score - 0.45) * 0.50))
    focus_score = max(0.1, min(1.0, 0.52 + (emotion_score - 0.45) * 0.55))
    motivation = max(0.1, min(1.0, 0.56 + (emotion_score - 0.45) * 0.45))
    caffeine_intake = 0.35 if time_score < 0.5 else 0.20

    return [
        emotion_score,
        time_score,
        sleep_quality,
        recent_performance,
        energy_level,
        focus_score,
        motivation,
        caffeine_intake,
    ]


def predict_readiness(emotion: str, time_of_day: str | None = None) -> str:
    """Return decoded readiness label for given emotion and (optional) time_of_day.

    If time_of_day is None, uses current time of day.
    """
    if _LOAD_ERROR:
        raise _LOAD_ERROR

    if time_of_day is None:
        time_of_day = get_time_of_day()

    emotion = emotion.strip()
    time_of_day = time_of_day.strip()

    bundle_kind = MODEL_BUNDLE["kind"]

    if bundle_kind == "encoder_bundle":
        emotion_encoded = MODEL_BUNDLE["emotion_encoder"].transform([emotion])[0]
        time_encoded = MODEL_BUNDLE["time_encoder"].transform([time_of_day])[0]

        input_df = pd.DataFrame(
            [[emotion_encoded, time_encoded]],
            columns=["Scenario_Emotion", "Scenario_Time"],
        )
        pred = MODEL_BUNDLE["model"].predict(input_df)[0]
        return MODEL_BUNDLE["readiness_encoder"].inverse_transform([pred])[0]

    features = _build_features(emotion, time_of_day)
    scaled = MODEL_BUNDLE["scaler"].transform([features])
    pred_idx = MODEL_BUNDLE["model"].predict(scaled)[0]
    return MODEL_BUNDLE["readiness_levels"][int(pred_idx)]


def prediction_source() -> str:
    if _LOAD_ERROR:
        return f"error:{type(_LOAD_ERROR).__name__}"
    return MODEL_BUNDLE["kind"]


def allowed_emotions() -> list[str]:
    return sorted({key.title() for key in EMOTION_HAPPINESS})


def allowed_times() -> list[str]:
    return ["Morning", "Afternoon", "Evening", "Night"]
