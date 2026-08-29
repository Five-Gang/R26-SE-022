"""
Content Type Recommendation Model - Recommends best content delivery method
Predicts: ACTIVE_RECALL, GUIDED_REVIEW, PASSIVE_READING
Based on: readiness_tier, item_difficulty, time_available, learning_history
Accuracy Target: 84%+
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import pickle
import os

class ContentTypeDataGenerator:
    """Generate content recommendation dataset"""
    
    @staticmethod
    def generate_dataset(n_samples=7000):
        """
        Features:
        - readiness_score (0-1)
        - item_difficulty (0-1)
        - time_available (0-1)
        - recent_accuracy (0-1)
        - learning_velocity (0-1): how quickly learning
        - retention_level (0-1)
        - engagement_score (0-1)
        
        Target (content type):
        - ACTIVE_RECALL: HIGH readiness, low-medium difficulty, for spaced repetition
        - GUIDED_REVIEW: MEDIUM readiness, medium difficulty, structured learning
        - PASSIVE_READING: LOW readiness, high difficulty, passive consumption
        """
        np.random.seed(42)
        
        content_types = ['ACTIVE_RECALL', 'GUIDED_REVIEW', 'PASSIVE_READING']
        type_indices = {ct: i for i, ct in enumerate(content_types)}
        
        X = []
        y = []
        
        for content_type in content_types:
            n_per_type = n_samples // len(content_types)
            
            if content_type == 'ACTIVE_RECALL':
                # HIGH readiness, low-medium difficulty
                readiness = np.random.normal(0.80, 0.10, n_per_type)
                difficulty = np.random.normal(0.40, 0.15, n_per_type)
                time_available = np.random.normal(0.70, 0.15, n_per_type)  # enough time
                accuracy = np.random.normal(0.80, 0.12, n_per_type)
                velocity = np.random.normal(0.75, 0.12, n_per_type)  # good learning
                retention = np.random.normal(0.78, 0.12, n_per_type)
                engagement = np.random.normal(0.85, 0.10, n_per_type)
                
            elif content_type == 'GUIDED_REVIEW':
                # MEDIUM readiness, medium difficulty
                readiness = np.random.normal(0.55, 0.15, n_per_type)
                difficulty = np.random.normal(0.55, 0.15, n_per_type)
                time_available = np.random.normal(0.50, 0.20, n_per_type)
                accuracy = np.random.normal(0.60, 0.15, n_per_type)
                velocity = np.random.normal(0.55, 0.15, n_per_type)
                retention = np.random.normal(0.58, 0.15, n_per_type)
                engagement = np.random.normal(0.60, 0.15, n_per_type)
                
            else:  # PASSIVE_READING
                # LOW readiness, high difficulty
                readiness = np.random.normal(0.35, 0.12, n_per_type)
                difficulty = np.random.normal(0.75, 0.12, n_per_type)
                time_available = np.random.normal(0.30, 0.15, n_per_type)  # limited time
                accuracy = np.random.normal(0.40, 0.15, n_per_type)
                velocity = np.random.normal(0.35, 0.15, n_per_type)
                retention = np.random.normal(0.38, 0.15, n_per_type)
                engagement = np.random.normal(0.40, 0.15, n_per_type)
            
            features = np.column_stack([
                np.clip(readiness, 0, 1),
                np.clip(difficulty, 0, 1),
                np.clip(time_available, 0, 1),
                np.clip(accuracy, 0, 1),
                np.clip(velocity, 0, 1),
                np.clip(retention, 0, 1),
                np.clip(engagement, 0, 1),
            ])
            
            X.extend(features)
            y.extend([type_indices[content_type]] * n_per_type)
        
        return np.array(X), np.array(y), content_types

class ContentRecommendationModel:
    """Train and evaluate content type recommendation model"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.content_types = ['ACTIVE_RECALL', 'GUIDED_REVIEW', 'PASSIVE_READING']
        
    def train(self, X, y):
        """Train Gradient Boosting model"""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train ensemble
        self.model = GradientBoostingClassifier(
            n_estimators=250,
            learning_rate=0.08,
            max_depth=8,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='weighted'
        )
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
        }
    
    def predict(self, features):
        """Predict best content type"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        features_scaled = self.scaler.transform([features])
        pred_idx = self.model.predict(features_scaled)[0]
        confidence = self.model.predict_proba(features_scaled)[0].max()
        
        return {
            'content_type': self.content_types[pred_idx],
            'confidence': float(confidence)
        }
    
    def save(self, path):
        """Save model to disk"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'content_types': self.content_types
            }, f)
    
    @staticmethod
    def load(path):
        """Load model from disk"""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        
        crm = ContentRecommendationModel()
        crm.model = data['model']
        crm.scaler = data['scaler']
        crm.content_types = data['content_types']
        return crm


def train_content_model():
    """Main training function"""
    print("=" * 60)
    print("CONTENT TYPE RECOMMENDATION MODEL TRAINING")
    print("=" * 60)
    
    # Generate dataset
    print("\n1️⃣  Generating content recommendation dataset (7000 samples)...")
    X, y, content_types = ContentTypeDataGenerator.generate_dataset(n_samples=7000)
    print(f"   ✓ Dataset shape: {X.shape}")
    print(f"   ✓ Content types: {content_types}")
    
    # Train model
    print("\n2️⃣  Training Gradient Boosting Classifier...")
    model = ContentRecommendationModel()
    metrics = model.train(X, y)
    
    # Display results
    print(f"\n3️⃣  Model Performance:")
    print(f"   ✓ Accuracy:  {metrics['accuracy']:.2%}")
    print(f"   ✓ Precision: {metrics['precision']:.2%}")
    print(f"   ✓ Recall:    {metrics['recall']:.2%}")
    print(f"   ✓ F1-Score:  {metrics['f1']:.2%}")
    
    # Save model
    model_path = "app/artifacts/content_recommendation_model.pkl"
    model.save(model_path)
    print(f"\n4️⃣  Model saved to: {model_path}")
    
    return model, metrics
