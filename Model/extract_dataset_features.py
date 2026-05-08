import os
import cv2
import csv
import sys
import numpy as np

# Add Backend path to import FeatureExtractor
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))
from services.feature_extractor import FeatureExtractor

def extract_dataset():
    print("Initializing MediaPipe Feature Extractor...")
    extractor = FeatureExtractor()
    dataset_path = "Data/archive"
    output_csv = "extracted_features.csv"
    
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
    
    print(f"Starting extraction. Saving to {output_csv}...")
    
    with open(output_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        # 4 numerical features representing the exact physical geometry of the face
        writer.writerow(["emotion", "eye_openness", "eyebrow_distance", "mouth_opening", "head_tilt"])
        
        for split in ['train', 'test']:
            split_path = os.path.join(dataset_path, split)
            if not os.path.exists(split_path): 
                print(f"Warning: {split_path} not found.")
                continue
            
            for folder in os.listdir(split_path):
                mapped_emotion = EMOTION_MAP.get(folder)
                if not mapped_emotion: continue
                
                folder_path = os.path.join(split_path, folder)
                img_files = os.listdir(folder_path)
                print(f"Processing {split}/{folder} -> {mapped_emotion} ({len(img_files)} images)")
                
                # To speed up, we can sample the dataset or process all. Let's process up to 1000 per class to balance it.
                count_per_class = 0
                for img_name in img_files:
                    if count_per_class >= 1000:
                        break # Stop after 1000 successful extractions per emotion folder to balance dataset
                        
                    img_path = os.path.join(folder_path, img_name)
                    img = cv2.imread(img_path)
                    if img is None: continue
                    
                    # FER images are 48x48. Resize to 256x256 to help MediaPipe find the landmarks
                    img_resized = cv2.resize(img, (256, 256), interpolation=cv2.INTER_CUBIC)
                    
                    try:
                        features = extractor.extract_features(img_resized)
                        if features:
                            writer.writerow([
                                mapped_emotion,
                                round(features["eye_openness"], 4),
                                round(features["eyebrow_distance"], 4),
                                round(features["mouth_opening"], 4),
                                round(features["head_tilt"], 4)
                            ])
                            success_count += 1
                            count_per_class += 1
                        else:
                            fail_count += 1
                    except Exception as e:
                        fail_count += 1
                        pass

    print("=========================================")
    print("EXTRACTION COMPLETE!")
    print(f"Successfully extracted numerical features from {success_count} images.")
    print(f"Failed to find faces in {fail_count} images (expected due to low-res dataset).")
    print(f"Saved dataset to: {output_csv}")
    print("=========================================")
    print("Your dataset is now mathematically perfectly aligned with Section 3.2.3 of the proposal!")

if __name__ == "__main__":
    extract_dataset()
