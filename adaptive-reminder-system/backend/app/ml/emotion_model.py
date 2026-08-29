"""
Emotion Recognition Model - Classifies student emotional state
Uses facial features and behavioral data to predict: Happy, Neutral, Sad, Frustrated
Accuracy Target: 85%+
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import pickle
import os

class EmotionDataGenerator:
    """Generate synthetic emotion dataset based on facial/behavioral features"""
    
    @staticmethod
    def generate_dataset(n_samples=5000):
        """
        Generate realistic emotion dataset
        Features: eye_openness, mouth_movement, brow_position, head_angle,
                  response_time, error_rate, pause_duration, fidget_count
        """
        np.random.seed(42)
        
        emotions = ['happy', 'neutral', 'sad', 'frustrated']
        emotion_indices = {e: i for i, e in enumerate(emotions)}
        
        X = []
        y = []
        
        for emotion in emotions:
            n_per_emotion = n_samples // len(emotions)
            
            if emotion == 'happy':
                # High eye openness, high mouth movement, raised brows
                eye_openness = np.random.normal(0.85, 0.08, n_per_emotion)
                mouth_movement = np.random.normal(0.75, 0.10, n_per_emotion)
                brow_position = np.random.normal(0.70, 0.10, n_per_emotion)
                head_angle = np.random.normal(0.45, 0.15, n_per_emotion)
                response_time = np.random.normal(0.6, 0.15, n_per_emotion)  # fast
                error_rate = np.random.normal(0.05, 0.05, n_per_emotion)  # low
                pause_duration = np.random.normal(0.3, 0.1, n_per_emotion)  # short
                fidget_count = np.random.normal(0.2, 0.1, n_per_emotion)  # low
                
            elif emotion == 'neutral':
                # Normal all features
                eye_openness = np.random.normal(0.60, 0.10, n_per_emotion)
                mouth_movement = np.random.normal(0.40, 0.12, n_per_emotion)
                brow_position = np.random.normal(0.50, 0.12, n_per_emotion)
                head_angle = np.random.normal(0.50, 0.15, n_per_emotion)
                response_time = np.random.normal(0.7, 0.15, n_per_emotion)
                error_rate = np.random.normal(0.10, 0.08, n_per_emotion)
                pause_duration = np.random.normal(0.5, 0.15, n_per_emotion)
                fidget_count = np.random.normal(0.4, 0.15, n_per_emotion)
                
            elif emotion == 'sad':
                # Low eye openness, low mouth movement, lowered brows
                eye_openness = np.random.normal(0.35, 0.10, n_per_emotion)
                mouth_movement = np.random.normal(0.20, 0.10, n_per_emotion)
                brow_position = np.random.normal(0.25, 0.12, n_per_emotion)
                head_angle = np.random.normal(0.60, 0.15, n_per_emotion)  # looking down
                response_time = np.random.normal(0.85, 0.15, n_per_emotion)  # slow
                error_rate = np.random.normal(0.20, 0.10, n_per_emotion)
                pause_duration = np.random.normal(0.8, 0.15, n_per_emotion)  # long
                fidget_count = np.random.normal(0.3, 0.12, n_per_emotion)
                
            else:  # frustrated
                # Tensed features, high error rate
                eye_openness = np.random.normal(0.55, 0.12, n_per_emotion)
                mouth_movement = np.random.normal(0.30, 0.12, n_per_emotion)
                brow_position = np.random.normal(0.35, 0.12, n_per_emotion)  # furrowed
                head_angle = np.random.normal(0.65, 0.18, n_per_emotion)
                response_time = np.random.normal(0.75, 0.18, n_per_emotion)
                error_rate = np.random.normal(0.35, 0.12, n_per_emotion)  # high
                pause_duration = np.random.normal(0.9, 0.15, n_per_emotion)
                fidget_count = np.random.normal(0.7, 0.15, n_per_emotion)  # high
            
            # Clip to valid range [0, 1]
            features = np.column_stack([
                np.clip(eye_openness, 0, 1),
                np.clip(mouth_movement, 0, 1),
                np.clip(brow_position, 0, 1),
                np.clip(head_angle, 0, 1),
                np.clip(response_time, 0, 1),
                np.clip(error_rate, 0, 1),
                np.clip(pause_duration, 0, 1),
                np.clip(fidget_count, 0, 1),
            ])
            
            X.extend(features)
            y.extend([emotion_indices[emotion]] * n_per_emotion)
        
        return np.array(X), np.array(y), emotions

class EmotionModel:
    """Train and evaluate emotion recognition model"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.emotions = ['happy', 'neutral', 'sad', 'frustrated']
        
    def train(self, X, y):
        """Train gradient boosting model for emotion recognition"""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train ensemble model
        self.model = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=7,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='weighted'
        )
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'confusion_matrix': confusion_matrix(y_test, y_pred),
        }
        
        return metrics
    
    def predict(self, features):
        """Predict emotion from features"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        features_scaled = self.scaler.transform([features])
        pred_idx = self.model.predict(features_scaled)[0]
        confidence = self.model.predict_proba(features_scaled)[0].max()
        
        return {
            'emotion': self.emotions[pred_idx],
            'confidence': float(confidence)
        }
    
    def save(self, path):
        """Save model to disk"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'emotions': self.emotions
            }, f)
    
    @staticmethod
    def load(path):
        """Load model from disk"""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        
        em = EmotionModel()
        em.model = data['model']
        em.scaler = data['scaler']
        em.emotions = data['emotions']
        return em


def train_emotion_model():
    """Main training function"""
    print("=" * 60)
    print("EMOTION RECOGNITION MODEL TRAINING")
    print("=" * 60)
    
    # Generate dataset
    print("\n1️⃣  Generating synthetic emotion dataset (5000 samples)...")
    X, y, emotions = EmotionDataGenerator.generate_dataset(n_samples=5000)
    print(f"   ✓ Dataset shape: {X.shape}")
    print(f"   ✓ Emotions: {emotions}")
    
    # Train model
    print("\n2️⃣  Training Gradient Boosting Classifier...")
    model = EmotionModel()
    metrics = model.train(X, y)
    
    # Display results
    print(f"\n3️⃣  Model Performance:")
    print(f"   ✓ Accuracy:  {metrics['accuracy']:.2%}")
    print(f"   ✓ Precision: {metrics['precision']:.2%}")
    print(f"   ✓ Recall:    {metrics['recall']:.2%}")
    print(f"   ✓ F1-Score:  {metrics['f1']:.2%}")
    
    # Save model
    model_path = "app/artifacts/emotion_model.pkl"
    model.save(model_path)
    print(f"\n4️⃣  Model saved to: {model_path}")
    
    return model, metrics
