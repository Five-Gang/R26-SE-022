import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

def train_rf_v2():
    data_path = 'extracted_features_v2.csv'
    try:
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        print(f"Error: {data_path} not found.")
        return

    print(f"Loaded V2 dataset with {len(df)} 7-dimensional samples.")
    
    # The 7 expanded features
    X = df[['eye_openness', 'eyebrow_distance', 'mouth_opening', 'head_tilt', 'mouth_width', 'mouth_height', 'eyebrow_asymmetry']]
    y = df['emotion']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    with open('label_encoder_v2.pkl', 'wb') as f:
        pickle.dump(le, f)
        
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    print("Training SUPERCHARGED V2 Random Forest Classifier...")
    
    # Massively upgraded hyperparameters (300 trees, depth 20)
    rf_model = RandomForestClassifier(
        n_estimators=300, 
        max_depth=20, 
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42, 
        class_weight='balanced',
        n_jobs=-1 # Use all CPU cores for training
    )
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n=========================================")
    print("--- V2 MODEL PERFORMANCE (VALIDATION) ---")
    print(f"Overall Accuracy: {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    print("=========================================\n")
    
    model_out = 'emotion_rf_model_v2.pkl'
    with open(model_out, 'wb') as f:
        pickle.dump(rf_model, f)
        
    print(f"Successfully saved V2 model to {model_out}")

if __name__ == "__main__":
    train_rf_v2()
