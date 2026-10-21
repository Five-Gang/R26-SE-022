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

def extract_dataset_v3():
    print("Initializing V3 Full-Mesh Extractor (900+ Dimensions)...")
    extractor = FeatureExtractor()
    # Use absolute path so this works regardless of the current working directory
    dataset_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Model', 'Data', 'archive')
    output_csv = "extracted_features_v3.csv"
    
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
        header_written = False
        
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
                        import mediapipe as mp
                        rgb_image = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
                        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
                        results = extractor.landmarker.detect(mp_image)
                        
                        if results.face_landmarks:
                            landmarks = results.face_landmarks[0]
                            features = extractor.extract_features(img_resized)
                            
                            if features:
                                if not header_written:
                                    headers = [
                                        "emotion", "eye_openness", "eyebrow_distance", 
                                        "mouth_opening", "head_tilt", "mouth_width", 
                                        "mouth_height", "eyebrow_asymmetry"
                                    ]
                                    for i in range(len(landmarks)):
                                        headers.append(f"lm_{i}_x")
                                        headers.append(f"lm_{i}_y")
                                    writer.writerow(headers)
                                    header_written = True
                                    
                                row = [
                                    mapped_emotion,
                                    round(features["eye_openness"], 4),
                                    round(features["eyebrow_distance"], 4),
                                    round(features["mouth_opening"], 4),
                                    round(features["head_tilt"], 4),
                                    round(features["mouth_width"], 4),
                                    round(features["mouth_height"], 4),
                                    round(features["eyebrow_asymmetry"], 4)
                                ]
                                
                                # Normalize the mesh coordinates by anchoring everything to the nose tip
                                nose_x = landmarks[1].x
                                nose_y = landmarks[1].y
                                
                                for lm in landmarks:
                                    row.append(round(lm.x - nose_x, 4))
                                    row.append(round(lm.y - nose_y, 4))
                                    
                                writer.writerow(row)
                                success_count += 1
                                count_per_class += 1
                            else:
                                fail_count += 1
                        else:
                            fail_count += 1
                    except Exception as e:
                        fail_count += 1
                        pass

    print(f"EXTRACTION V3 COMPLETE! Saved {success_count} ultra-dimensional rows to {output_csv}.")

if __name__ == "__main__":
    extract_dataset_v3()
