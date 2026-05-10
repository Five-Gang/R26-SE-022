"""
Study Readiness Prediction Model - Predicts student's readiness level
Combines emotion, time-of-day, sleep quality, recent performance
Output: HIGH, MEDIUM, LOW readiness tier
Accuracy Target: 82%+
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

class ReadinessDataGenerator:
    """Generate study readiness dataset"""
    
    @staticmethod
    def generate_dataset(n_samples=6000):
        """
        Features:
        - emotion_happiness (0-1): from emotion model
        - time_of_day (0-23): hour
        - sleep_quality (0-1): last night sleep
        - recent_performance (0-1): avg grade on recent items
        - energy_level (0-1): subjective or inferred
        - focus_score (0-1): from behavioral tracking
        - motivation (0-1): from session data
        - caffeine_intake (0-1): time since caffeine
        """
        np.random.seed(42)
        
        readiness_levels = ['HIGH', 'MEDIUM', 'LOW']
        readiness_indices = {level: i for i, level in enumerate(readiness_levels)}
        
        X = []
        y = []
        
        for readiness in readiness_levels:
            n_per_readiness = n_samples // len(readiness_levels)
            
            if readiness == 'HIGH':
                # High happiness, good sleep, high performance
                emotion = np.random.normal(0.80, 0.10, n_per_readiness)
                time_hour = np.random.normal(10, 4, n_per_readiness)  # morning/mid-day
                sleep_quality = np.random.normal(0.85, 0.10, n_per_readiness)
                recent_perf = np.random.normal(0.80, 0.12, n_per_readiness)
                energy = np.random.normal(0.85, 0.10, n_per_readiness)
                focus = np.random.normal(0.80, 0.10, n_per_readiness)
                motivation = np.random.normal(0.85, 0.10, n_per_readiness)
                caffeine = np.random.normal(0.60, 0.20, n_per_readiness)
                
            elif readiness == 'MEDIUM':
                # Mixed features
                emotion = np.random.normal(0.55, 0.15, n_per_readiness)
                time_hour = np.random.normal(14, 5, n_per_readiness)  # afternoon
                sleep_quality = np.random.normal(0.60, 0.15, n_per_readiness)
                recent_perf = np.random.normal(0.60, 0.15, n_per_readiness)
                energy = np.random.normal(0.55, 0.15, n_per_readiness)
                focus = np.random.normal(0.55, 0.15, n_per_readiness)
                motivation = np.random.normal(0.60, 0.15, n_per_readiness)
                caffeine = np.random.normal(0.40, 0.25, n_per_readiness)
                
            else:  # LOW
                # Low happiness, poor sleep, low performance
                emotion = np.random.normal(0.30, 0.12, n_per_readiness)
                time_hour = np.random.normal(22, 3, n_per_readiness)  # late night
                sleep_quality = np.random.normal(0.35, 0.15, n_per_readiness)
                recent_perf = np.random.normal(0.40, 0.15, n_per_readiness)
                energy = np.random.normal(0.30, 0.15, n_per_readiness)
                focus = np.random.normal(0.30, 0.15, n_per_readiness)
                motivation = np.random.normal(0.35, 0.15, n_per_readiness)
                caffeine = np.random.normal(0.20, 0.20, n_per_readiness)
            
            # Normalize time to [0, 1]
            time_normalized = (np.clip(time_hour, 0, 23)) / 23.0
            
            features = np.column_stack([
                np.clip(emotion, 0, 1),
                time_normalized,
                np.clip(sleep_quality, 0, 1),
                np.clip(recent_perf, 0, 1),
                np.clip(energy, 0, 1),
                np.clip(focus, 0, 1),
                np.clip(motivation, 0, 1),
                np.clip(caffeine, 0, 1),
            ])
            
            X.extend(features)
            y.extend([readiness_indices[readiness]] * n_per_readiness)
        
        return np.array(X), np.array(y), readiness_levels

class ReadinessModel:
    """Train and evaluate study readiness model"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.readiness_levels = ['HIGH', 'MEDIUM', 'LOW']
        
    def train(self, X, y):
        """Train Random Forest model"""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train ensemble
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        return {
            'accuracy': accuracy,
            'report': classification_report(y_test, y_pred, 
                                           target_names=self.readiness_levels),
        }
    
    def predict(self, features):
        """Predict readiness tier"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        features_scaled = self.scaler.transform([features])
        pred_idx = self.model.predict(features_scaled)[0]
        confidence = self.model.predict_proba(features_scaled)[0].max()
        
        return {
            'readiness_tier': self.readiness_levels[pred_idx],
            'confidence': float(confidence)
        }
    
    def save(self, path):
        """Save model to disk"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'readiness_levels': self.readiness_levels
            }, f)
    
    @staticmethod
    def load(path):
        """Load model from disk"""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        
        rm = ReadinessModel()
        rm.model = data['model']
        rm.scaler = data['scaler']
        rm.readiness_levels = data['readiness_levels']
        return rm


def train_readiness_model():
    """Main training function"""
    print("=" * 60)
    print("STUDY READINESS PREDICTION MODEL TRAINING")
    print("=" * 60)
    
    # Generate dataset
    print("\n1️⃣  Generating readiness dataset (6000 samples)...")
    X, y, readiness_levels = ReadinessDataGenerator.generate_dataset(n_samples=6000)
    print(f"   ✓ Dataset shape: {X.shape}")
    print(f"   ✓ Readiness levels: {readiness_levels}")
    
    # Train model
    print("\n2️⃣  Training Random Forest Classifier...")
    model = ReadinessModel()
    metrics = model.train(X, y)
    
    # Display results
    print(f"\n3️⃣  Model Performance:")
    print(f"   ✓ Accuracy: {metrics['accuracy']:.2%}")
    print(f"\n   Classification Report:")
    for line in metrics['report'].split('\n'):
        if line.strip():
            print(f"   {line}")
    
    # Save model
    model_path = "app/artifacts/readiness_model.pkl"
    model.save(model_path)
    print(f"\n4️⃣  Model saved to: {model_path}")
    
    return model, metrics
