"""
Export Synthetic Datasets to CSV Files
Extracts datasets from ML models and saves them for analysis/retraining
"""

import os
import sys
import pandas as pd
from pathlib import Path

# Add the ml-service to path
sys.path.insert(0, os.getcwd())

try:
    from app.ml.emotion_model import EmotionDataGenerator as EmotionGen
    from app.ml.readiness_model import ReadinessDataGenerator as ReadinessGen
    from app.ml.content_model import ContentTypeDataGenerator as ContentGen
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the ml-service directory")
    sys.exit(1)

# Create datasets folder (in project root)
DATASETS_DIR = Path(__file__).parent.parent.parent / "datasets" / "synthetic"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("  ML DATASETS EXPORT TO CSV")
print("=" * 70)
print(f"\nExporting to: {DATASETS_DIR}")

# ============================================================================
# 1. EMOTION RECOGNITION DATASET
# ============================================================================
print("\n1️⃣  Exporting Emotion Recognition Dataset...")
try:
    X_emotion, y_emotion, emotions = EmotionGen.generate_dataset(n_samples=5000)
    
    emotion_data = pd.DataFrame(
        X_emotion,
        columns=['eye_openness', 'mouth_movement', 'brow_position', 'head_angle',
                 'response_time', 'error_rate', 'pause_duration', 'fidget_count']
    )
    emotion_data['emotion_label'] = [emotions[i] for i in y_emotion]
    emotion_data['emotion_class'] = y_emotion
    
    emotion_file = DATASETS_DIR / "emotion_recognition.csv"
    emotion_data.to_csv(emotion_file, index=False)
    
    print(f"   ✓ Shape: {emotion_data.shape}")
    print(f"   ✓ Classes: {emotion_data['emotion_label'].unique().tolist()}")
    print(f"   ✓ Saved to: {emotion_file}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 2. STUDY READINESS DATASET
# ============================================================================
print("\n2️⃣  Exporting Study Readiness Dataset...")
try:
    X_readiness, y_readiness, readiness_levels = ReadinessGen.generate_dataset(n_samples=6000)
    
    readiness_data = pd.DataFrame(
        X_readiness,
        columns=['emotion_happiness', 'time_of_day', 'sleep_quality', 'recent_performance',
                 'energy_level', 'focus_score', 'motivation', 'caffeine_intake']
    )
    readiness_data['readiness_tier'] = [readiness_levels[i] for i in y_readiness]
    readiness_data['readiness_class'] = y_readiness
    
    readiness_file = DATASETS_DIR / "study_readiness.csv"
    readiness_data.to_csv(readiness_file, index=False)
    
    print(f"   ✓ Shape: {readiness_data.shape}")
    print(f"   ✓ Classes: {readiness_data['readiness_tier'].unique().tolist()}")
    print(f"   ✓ Saved to: {readiness_file}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 3. CONTENT RECOMMENDATION DATASET
# ============================================================================
print("\n3️⃣  Exporting Content Recommendation Dataset...")
try:
    X_content, y_content, content_types = ContentGen.generate_dataset(n_samples=7000)
    
    content_data = pd.DataFrame(
        X_content,
        columns=['readiness_score', 'item_difficulty', 'time_available', 'recent_accuracy',
                 'learning_velocity', 'retention_level', 'engagement_score']
    )
    content_data['content_type'] = [content_types[i] for i in y_content]
    content_data['content_class'] = y_content
    
    content_file = DATASETS_DIR / "content_recommendation.csv"
    content_data.to_csv(content_file, index=False)
    
    print(f"   ✓ Shape: {content_data.shape}")
    print(f"   ✓ Classes: {content_data['content_type'].unique().tolist()}")
    print(f"   ✓ Saved to: {content_file}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 70)
print("✅ EXPORT COMPLETE")
print("=" * 70)
print(f"\nDatasets saved to: {DATASETS_DIR}")
print("\nFiles created:")
print(f"  1. emotion_recognition.csv (5000 rows × 9 columns)")
print(f"  2. study_readiness.csv (6000 rows × 9 columns)")
print(f"  3. content_recommendation.csv (7000 rows × 8 columns)")
print("\nTotal: 18,000 synthetic training samples")
print("\nYou can now:")
print("  • Download these CSV files to analyze")
print("  • Use them for retraining locally")
print("  • Upload to Colab for advanced training")
print("  • Share with team for validation")
print("=" * 70)
