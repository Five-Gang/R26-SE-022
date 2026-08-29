import os
import pickle
import numpy as np

class EmotionClassifier:
    def __init__(self, model_path, encoder_path):
        """
        Initializes the fully aligned, ultra-lightweight Random Forest Classifier.
        Loads the scikit-learn model trained exclusively on numerical feature vectors.
        """
        self.model_path = model_path
        self.encoder_path = encoder_path
        
        print("Loading Proposal-Aligned Random Forest Emotion Classifier...")
        
        # Load the Random Forest model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
            
        # Load the Label Encoder to get correct class names
        if not os.path.exists(encoder_path):
            raise FileNotFoundError(f"Encoder file not found: {encoder_path}")
        with open(encoder_path, 'rb') as f:
            self.encoder = pickle.load(f)
            
        self.classes = self.encoder.classes_

    def predict(self, feature_vector):
        """
        Predicts the emotion based on the 4-dimensional numerical feature vector.
        Args:
            feature_vector (list): [eye_openness, eyebrow_distance, mouth_opening, head_tilt]
        Returns:
            dict: {
                "emotion": str,
                "confidence": float,
                "probabilities": dict,
                "embedding": list
            }
        """
        # Scikit-learn expects a 2D array
        x_input = np.array([feature_vector])
        
        # Get raw probabilities from all trees
        probs = self.model.predict_proba(x_input)[0]
        
        # Get the highest probability
        max_idx = np.argmax(probs)
        confidence = probs[max_idx] * 100.0
        predicted_class = self.classes[max_idx]
        
        # Create a dictionary of all probabilities
        probs_dict = {
            self.classes[i].capitalize(): float(probs[i] * 100.0)
            for i in range(len(self.classes))
        }
        
        # Create a tiny numerical embedding array for the dashboard
        embedding = [float(p) for p in probs]

        return {
            "emotion": predicted_class.capitalize(),
            "confidence": confidence,
            "probabilities": probs_dict,
            "embedding": embedding
        }
