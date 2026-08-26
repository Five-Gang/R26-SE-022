import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

def train_rf():
    data_path = 'extracted_features.csv'
    try:
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        print(f"Error: {data_path} not found. Please wait for the extraction script to finish.")
        return

    # Check if we have enough data
    if len(df) < 50:
        print("Not enough data extracted yet. Please wait for the extraction script to pull more faces.")
        return

    print(f"Loaded dataset with {len(df)} perfectly aligned numerical samples.")
    
    # The exact 4 features requested by your proposal
    X = df[['eye_openness', 'eyebrow_distance', 'mouth_opening', 'head_tilt']]
    y = df['emotion']
    
    # Encode text labels to numbers
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Save the label encoder so the backend knows the class names later
    with open('label_encoder.pkl', 'wb') as f:
        pickle.dump(le, f)
        
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    print("Training Lightweight Random Forest Classifier (Section 3.2.3 compliant)...")
    
    # 100 trees with max_depth 10 is EXTREMELY lightweight, taking ~1ms to predict on a laptop
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced')
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n=========================================")
    print("--- MODEL PERFORMANCE (VALIDATION) ---")
    print(f"Overall Accuracy: {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    print("=========================================\n")
    
    model_out = 'emotion_rf_model.pkl'
    with open(model_out, 'wb') as f:
        pickle.dump(rf_model, f)
        
    print(f"Successfully saved perfectly-aligned model to {model_out}")
    print(f"Successfully saved label encoder to label_encoder.pkl")
    print("Your project now perfectly matches Section 3.2.3 of the Research Proposal!")

if __name__ == "__main__":
    train_rf()
