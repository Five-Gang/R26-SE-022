import torch
import torch.nn as nn
import torch.optim as optim
import time
import os
import numpy as np
from sklearn.utils.class_weight import compute_class_weight
from preprocess_data import get_dataloaders
from emotion_model import EmotionCNN
from config import EPOCHS, LEARNING_RATE, MODEL_SAVE_PATH, CLASS_TO_IDX

def train_model():
    print("=" * 50)
    print("Affect and Attention-Aware Emotion Detection Module")
    print("Starting Model Training Pipeline")
    print("=" * 50)

    # Setup device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load data
    print("Preparing datasets...")
    train_loader, test_loader, train_len, test_len = get_dataloaders()
    print(f"Training samples: {train_len}")
    print(f"Testing samples: {test_len}")

    # Calculate class weights dynamically
    print("Calculating class weights to handle dataset imbalance...")
    all_labels = []
    for _, labels in train_loader:
        all_labels.extend(labels.numpy())
    
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(all_labels),
        y=all_labels
    )
    class_weights_tensor = torch.FloatTensor(class_weights).to(device)
    print(f"Computed Class Weights: {class_weights}")

    # Initialize model
    model = EmotionCNN(num_classes=5).to(device)
    
    # Loss and optimizer
    # Applying the calculated class weights to the loss function
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=3)

    best_test_loss = float('inf')
    best_accuracy = 0.0

    print("\nStarting training loop...")
    for epoch in range(EPOCHS):
        start_time = time.time()
        
        # Training Phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += labels.size(0)
            train_correct += predicted.eq(labels).sum().item()
            
            if (batch_idx + 1) % 100 == 0:
                print(f"Epoch [{epoch+1}/{EPOCHS}] Batch [{batch_idx+1}/{len(train_loader)}] Loss: {loss.item():.4f}")

        epoch_train_loss = train_loss / len(train_loader)
        epoch_train_acc = 100. * train_correct / train_total

        # Evaluation Phase
        model.eval()
        test_loss = 0.0
        test_correct = 0
        test_total = 0
        
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                test_loss += loss.item()
                _, predicted = outputs.max(1)
                test_total += labels.size(0)
                test_correct += predicted.eq(labels).sum().item()

        epoch_test_loss = test_loss / len(test_loader)
        epoch_test_acc = 100. * test_correct / test_total
        
        # Learning rate scheduling
        scheduler.step(epoch_test_loss)
        
        end_time = time.time()
        epoch_time = end_time - start_time

        print(f"\nEpoch {epoch+1}/{EPOCHS} Summary ({epoch_time:.1f}s):")
        print(f"Train Loss: {epoch_train_loss:.4f} | Train Acc: {epoch_train_acc:.2f}%")
        print(f"Test  Loss: {epoch_test_loss:.4f} | Test  Acc: {epoch_test_acc:.2f}%")

        # Save best model
        if epoch_test_acc > best_accuracy:
            best_accuracy = epoch_test_acc
            print(f"🌟 New best accuracy! Saving model to {MODEL_SAVE_PATH}")
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'accuracy': best_accuracy,
                'class_to_idx': CLASS_TO_IDX
            }, MODEL_SAVE_PATH)

    print("\nTraining completed!")
    print(f"Best Test Accuracy: {best_accuracy:.2f}%")
    print(f"Model saved at: {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    train_model()
