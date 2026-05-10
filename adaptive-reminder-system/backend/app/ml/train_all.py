"""
ML Model Training Orchestrator
Trains all models: Emotion, Readiness, Content Recommendation
Generates comprehensive demo report
"""

import sys
from datetime import datetime

from app.ml.content_model import train_content_model
from app.ml.emotion_model import train_emotion_model
from app.ml.readiness_model import train_readiness_model


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def print_header(title):
    """Print formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_section(title):
    """Print formatted section."""
    print(f"\n{'-' * 70}")
    print(f"  {title}")
    print(f"{'-' * 70}")


def train_all_models():
    """Train all ML models for the system."""
    print_header("ADAPTIVE STUDY REMINDER SYSTEM - ML MODEL TRAINING")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    try:
        print_section("MODULE 1: EMOTION RECOGNITION MODEL")
        emotion_model, emotion_metrics = train_emotion_model()
        results["emotion"] = {
            "status": "SUCCESS",
            "accuracy": emotion_metrics["accuracy"],
            "metrics": emotion_metrics,
        }

        print_section("MODULE 2: STUDY READINESS PREDICTION MODEL")
        readiness_model, readiness_metrics = train_readiness_model()
        results["readiness"] = {
            "status": "SUCCESS",
            "accuracy": readiness_metrics["accuracy"],
            "metrics": readiness_metrics,
        }

        print_section("MODULE 3: CONTENT TYPE RECOMMENDATION MODEL")
        content_model, content_metrics = train_content_model()
        results["content"] = {
            "status": "SUCCESS",
            "accuracy": content_metrics["accuracy"],
            "metrics": content_metrics,
        }

    except Exception as e:
        print(f"\nERROR during training: {str(e)}")
        import traceback

        traceback.print_exc()
        return False

    print_header("TRAINING SUMMARY REPORT")

    total_accuracy = sum(
        [r["accuracy"] for r in results.values() if r["status"] == "SUCCESS"]
    )
    avg_accuracy = total_accuracy / len(results)

    print("\nOK Emotion Recognition Model")
    print(f"  Accuracy: {results['emotion']['accuracy']:.2%}")

    print("\nOK Study Readiness Prediction Model")
    print(f"  Accuracy: {results['readiness']['accuracy']:.2%}")

    print("\nOK Content Recommendation Model")
    print(f"  Accuracy: {results['content']['accuracy']:.2%}")

    print(f"\n{'-' * 70}")
    print(f"Average Accuracy: {avg_accuracy:.2%}")
    print("Target Accuracy: 80%+")
    print(f"Status: {'PASSED' if avg_accuracy >= 0.80 else 'REVIEW NEEDED'}")

    print(f"\n{'-' * 70}")
    print("Models Saved:")
    print("  - app/artifacts/emotion_model.pkl")
    print("  - app/artifacts/readiness_model.pkl")
    print("  - app/artifacts/content_recommendation_model.pkl")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    return True


if __name__ == "__main__":
    success = train_all_models()
    sys.exit(0 if success else 1)
