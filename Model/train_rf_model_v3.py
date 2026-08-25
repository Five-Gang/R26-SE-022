import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

def train_rf_v3():
    data_path = 'extracted_features_v3.csv'
    try:
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        print(f"Error: {data_path} not found.")
        return

    print(f"Loaded V3 dataset with {len(df)} samples, each having {len(df.columns)-1} geometric dimensions!")
    
    # X contains all 900+ features
    X = df.drop(columns=['emotion'])
    y = df['emotion']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    with open('label_encoder_v3.pkl', 'wb') as f:
        pickle.dump(le, f)
        
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    print("Training the ULTIMATE V3 Full-Mesh Random Forest Classifier...")
    
    # Massive hyperparameters to handle high-dimensional data
    rf_model = RandomForestClassifier(
        n_estimators=500, 
        max_depth=30, 
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42, 
        class_weight='balanced',
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n=========================================")
    print("--- V3 MODEL PERFORMANCE (VALIDATION) ---")
    print(f"Overall Accuracy: {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    print("=========================================\n")
    
    model_out = 'emotion_rf_model_v3.pkl'
    with open(model_out, 'wb') as f:
        pickle.dump(rf_model, f)
        
    print(f"Successfully saved V3 model to {model_out}")

if __name__ == "__main__":
    train_rf_v3()
