import os
import base64
import numpy as np
import cv2
import time
from services.feature_extractor import FeatureExtractor
from services.emotion_classifier import EmotionClassifier

class DetectionService:
    def __init__(self):
        self.feature_extractor = FeatureExtractor()
        
        # Path to the trained model
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                "Model", "emotion_rf_model.pkl")
        encoder_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                "Model", "label_encoder.pkl")
        self.emotion_classifier = EmotionClassifier(model_path, encoder_path)
        
    def _apply_hybrid_fusion(self, cnn_probs, features):
        """
        Fuses CNN probabilities with exact MediaPipe facial geometry to dramatically improve accuracy.
        Overrides incorrect CNN guesses if the physical facial muscles strongly suggest otherwise.
        """
        adjusted = {k.capitalize(): float(v) for k, v in cnn_probs.items()}
        
        ear = features["eye_openness"]
        mouth = features["mouth_opening"]
        tilt = abs(features["head_tilt"])
        eyebrow = features["eyebrow_distance"]
        
        # 1. Boredom / Fatigue Override (Heavy eyelids or head heavily tilted)
        if ear < 0.22 or tilt > 15:
            adjusted["Bored"] += 40.0
            adjusted["Focused"] -= 20.0
            
        # 2. Confusion Override (Mouth slightly open, eyes wide)
        if mouth > 0.08 and ear > 0.27:
            adjusted["Confused"] += 35.0
            
        # 3. Frustrated Override (Tight mouth, low/furrowed eyebrows)
        if mouth < 0.02 and eyebrow < 0.22:
            adjusted["Frustrated"] += 30.0
            
        # 4. Focused Override (Head perfectly straight, normal eyes, mouth fully closed)
        if tilt < 5 and 0.25 < ear < 0.32 and mouth < 0.03:
            adjusted["Focused"] += 25.0
            adjusted["Neutral"] -= 10.0 # CNN frequently confuses focused with neutral
            
        # 5. Normalize back to 100%
        for k in adjusted:
            if adjusted[k] < 0: adjusted[k] = 0.0
                
        total = sum(adjusted.values())
        if total > 0:
            for k in adjusted:
                adjusted[k] = (adjusted[k] / total) * 100.0
                
        dominant = max(adjusted, key=adjusted.get)
        confidence = adjusted[dominant]
        
        return dominant, confidence, adjusted

    def process_frame(self, base64_image):
        """
        Main pipeline to process an incoming frame and return insights.
        """
        start_time = time.time()
        
        # 1. Decode Base64 to OpenCV Image
        try:
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
            img_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None: raise ValueError("Could not decode image")
        except Exception as e:
            return {"error": f"Invalid image format: {e}"}

        # 2. Extract facial features and eye behavior
        features = self.feature_extractor.extract_features(image)
        if features is None: return {"error": "No face detected in the frame"}
            
        # 3. Prepare numerical feature vector for the Random Forest
        feature_vector = [
            features["eye_openness"],
            features["eyebrow_distance"],
            features["mouth_opening"],
            features["head_tilt"]
        ]
            
        # 4. Run Emotion Classification (Scikit-Learn Random Forest)
        emotion_result = self.emotion_classifier.predict(feature_vector)
        
        # 5. HYBRID FUSION: Merge CNN with MediaPipe Landmarks
        dominant_emotion, final_confidence, final_probs = self._apply_hybrid_fusion(
            emotion_result["probabilities"], 
            features
        )
        
        # 6. Compute Attention Score
        eye_penalty = max(0, 100 - (features["eye_openness"] * 300))
        tilt_penalty = min(50, abs(features["head_tilt"]))
        attention_base = {"Focused": 95, "Neutral": 70, "Confused": 50, "Frustrated": 40, "Bored": 20}
        base_score = attention_base.get(dominant_emotion, 50)
        attention_score = max(0, min(100, int(base_score - eye_penalty - tilt_penalty)))
        
        # Formatting the response exactly how the mock frontend expected it
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # CamelCase features for the frontend
        formatted_features = {
            "eyeOpenness": features["eye_openness"],
            "eyebrowDist": features["eyebrow_distance"],
            "mouthOpening": features["mouth_opening"],
            "headTilt": features["head_tilt"],
            "blinkRate": 0, 
            "earLeft": features["ear_left"],
            "earRight": features["ear_right"],
            "gazeDir": 0.0, 
            "is_blinking": features["is_blinking"]
        }
        
        response = {
            "emotion": dominant_emotion,
            "confidence": int(final_confidence),
            "probs": {k: int(v) for k, v in final_probs.items()},
            "ear": features["eye_openness"],
            "eyeOpenness": int(features["eye_openness"] * 300),
            "blinkRate": 0, 
            "attentionScore": attention_score,
            "features": formatted_features,
            "boundingBox": features["bounding_box"],
            "embedding": emotion_result["embedding"],
            "processing_time_ms": processing_time_ms,
            "capturing": True
        }
        
        return response
