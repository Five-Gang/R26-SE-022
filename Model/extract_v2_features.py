import os
import cv2
import csv
import sys
import numpy as np

# Add Backend and Backend/services to sys.path so that feature_extractor.py
# can resolve its own internal 'from services.ear_calculator import' correctly
_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Backend')
sys.path.insert(0, _BACKEND_DIR)
sys.path.insert(0, os.path.join(_BACKEND_DIR, 'services'))
# pyrefly: ignore [missing-import]
from services.feature_extractor import FeatureExtractor

def extract_dataset():
    print("Initializing V2 7-Feature Extractor...")
    extractor = FeatureExtractor()
    # Use absolute path so this works regardless of the current working directory
    dataset_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Model', 'Data', 'archive')
    output_csv = "extracted_features_v2.csv"
    
    EMOTION_MAP = {
        'happy': 'focused',
        'surprise': 'confused',
        'angry': 'frustrated',
        'sad': 'bored',
        'neutral': 'neutral',
        'fear': 'confused',     
        'disgust': 'frustrated'
    }
    
    success_count = 0
    fail_count = 0
    
    with open(output_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "emotion", 
            "eye_openness", 
            "eyebrow_distance", 
            "mouth_opening", 
            "head_tilt",
            "mouth_width",
            "mouth_height",
            "eyebrow_asymmetry"
        ])
        
        for split in ['train', 'test']:
            split_path = os.path.join(dataset_path, split)
            if not os.path.exists(split_path): continue
            
            for folder in os.listdir(split_path):
                mapped_emotion = EMOTION_MAP.get(folder)
                if not mapped_emotion: continue
                
                folder_path = os.path.join(split_path, folder)
                img_files = os.listdir(folder_path)
                print(f"Processing {split}/{folder} -> {mapped_emotion} ({len(img_files)} images)")
                
                count_per_class = 0
                for img_name in img_files:
                    if count_per_class >= 1000: break
                        
                    img_path = os.path.join(folder_path, img_name)
                    img = cv2.imread(img_path)
                    if img is None: continue
                    
                    img_resized = cv2.resize(img, (256, 256), interpolation=cv2.INTER_CUBIC)
                    
                    try:
                        features = extractor.extract_features(img_resized)
                        if features:
                            writer.writerow([
                                mapped_emotion,
                                round(features["eye_openness"], 4),
                                round(features["eyebrow_distance"], 4),
                                round(features["mouth_opening"], 4),
                                round(features["head_tilt"], 4),
                                round(features["mouth_width"], 4),
                                round(features["mouth_height"], 4),
                                round(features["eyebrow_asymmetry"], 4)
                            ])
                            success_count += 1
                            count_per_class += 1
                        else:
                            fail_count += 1
                    except Exception as e:
                        fail_count += 1
                        pass

    print(f"EXTRACTION V2 COMPLETE! Saved {success_count} rows to {output_csv}.")

if __name__ == "__main__":
    extract_dataset()
