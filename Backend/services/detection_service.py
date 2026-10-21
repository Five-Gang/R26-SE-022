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
        
        # Path to the trained first version Random Forest model
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                "Model", "emotion_rf_model.pkl")
        encoder_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                "Model", "label_encoder_v1_backup.pkl")
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
        
        # 1. Boredom / Severe Drowsiness Override (Eyelids heavily closed EAR < 0.12 or extreme head drop)
        if ear < 0.12 or tilt > 20:
            adjusted["Bored"] += 45.0
            adjusted["Focused"] -= 30.0
            
        # 2. Confusion Override (Mouth slightly agape, asymmetric eyebrows/wide eyes)
        if mouth > 0.09 and ear > 0.26:
            adjusted["Confused"] += 35.0
            
        # 3. Frustrated Override (Tight mouth, furrowed eyebrows)
        if mouth < 0.02 and eyebrow < 0.20:
            adjusted["Frustrated"] += 30.0
            
        # 4. Focused State (Normal open eyes, upright head, calm mouth)
        if tilt < 12 and ear >= 0.18 and mouth < 0.05:
            adjusted["Focused"] += 35.0
            adjusted["Neutral"] -= 15.0
            
        # 5. Normalize back to 100%
        for k in adjusted:
            if adjusted[k] < 0: 
                adjusted[k] = 0.0
                
        total = sum(adjusted.values())
        if total > 0:
            for k in adjusted:
                adjusted[k] = (adjusted[k] / total) * 100.0
                
        dominant = max(adjusted, key=lambda k: adjusted[k])
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
            
        # 3. Prepare numerical feature vector for the first version Random Forest (4 dimensions)
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
        
        # 6. Compute Accurate Attention Score (0-100)
        # Normal open eyes EAR: 0.18 - 0.35, Upright head tilt: < 10 deg
        eye_openness = features["eye_openness"]
        tilt = abs(features["head_tilt"])
        
        # Calculate eye alertness (0-100%)
        eye_alertness = min(100.0, max(0.0, (eye_openness - 0.10) / (0.28 - 0.10) * 100.0))
        
        # Head posture penalty only if significantly tilted
        posture_factor = max(0.0, 1.0 - (max(0.0, tilt - 10.0) / 30.0))
        
        # Emotion base weighting
        emotion_weights = {
            "Focused": 95,
            "Neutral": 80,
            "Confused": 65,
            "Frustrated": 50,
            "Bored": 25
        }
        base_weight = emotion_weights.get(dominant_emotion, 70)
        
        # Blended Attention Score
        raw_attention = (0.50 * base_weight) + (0.35 * eye_alertness) + (0.15 * (posture_factor * 100))
        attention_score = int(min(100, max(0, round(raw_attention))))
        
        # Gaze stability estimate (Direct Screen vs Looking Away)
        gaze_status = "Direct Screen Focus" if tilt < 15 and eye_openness > 0.14 else "Looking Away"
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        formatted_features = {
            "eyeOpenness": eye_openness,
            "eyebrowDist": features["eyebrow_distance"],
            "mouthOpening": features["mouth_opening"],
            "headTilt": features["head_tilt"],
            "earLeft": features["ear_left"],
            "earRight": features["ear_right"],
            "gazeStatus": gaze_status,
            "is_blinking": features["is_blinking"]
        }
        
        response = {
            "emotion": dominant_emotion,
            "confidence": int(round(final_confidence)),
            "probs": {k: int(round(v)) for k, v in final_probs.items()},
            "ear": round(eye_openness, 2),
            "eyeOpenness": int(round(eye_alertness)),
            "attentionScore": attention_score,
            "gazeStatus": gaze_status,
            "features": formatted_features,
            "boundingBox": features["bounding_box"],
            "embedding": emotion_result["embedding"],
            "processing_time_ms": processing_time_ms,
            "capturing": True
        }
        
        return response
