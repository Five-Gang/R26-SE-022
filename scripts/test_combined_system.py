"""Exercise Mihiraj's emotion API and the adaptive pipeline as one flow."""

import argparse
import base64
import json
from pathlib import Path
from urllib.request import Request, urlopen


def post_json(url: str, payload: dict) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path, nargs="?", help="Face image to send to Mihiraj's API")
    parser.add_argument("--emotion", choices=["Focused", "Neutral", "Confused", "Frustrated", "Bored"], help="Use a detector response directly")
    parser.add_argument("--emotion-url", default="http://127.0.0.1:8000/api/detect-emotion")
    parser.add_argument("--pipeline-url", default="http://127.0.0.1:8001/api/v1/pipeline/complete")
    args = parser.parse_args()

    if args.emotion:
        detection = {"emotion": args.emotion, "source": "contract-test"}
    elif args.image:
        image_data = base64.b64encode(args.image.read_bytes()).decode("ascii")
        detection = post_json(args.emotion_url, {"image": image_data})
    else:
        parser.error("provide an image or --emotion")
    emotion = detection["emotion"]
    pipeline = post_json(
        args.pipeline_url,
        {
            "emotion": emotion,
            "time_of_day": "Morning",
            "quality_percentage": 80,
            "difficulty_level": "medium",
            "days_since_last_review": 2,
        },
    )

    print(json.dumps({
        "mihiraj": {
            "emotion": detection["emotion"],
            "attention_score": detection.get("attentionScore"),
            "confidence": detection.get("confidence"),
            "source": detection.get("source", "mihiraj-api"),
        },
        "adaptive_pipeline": {
            "readiness": pipeline["stages"]["stage_1_readiness"]["output"]["readiness_level"],
            "retention": pipeline["stages"]["stage_2_memory"]["output"]["retention_probability"],
            "priority": pipeline["stages"]["stage_2_memory"]["output"]["priority_score"],
            "action": pipeline["stages"]["stage_3_scheduler"]["output"]["action"],
            "activity": pipeline["stages"]["stage_4_content"]["output"]["activity"],
        },
    }, indent=2))


if __name__ == "__main__":
    main()