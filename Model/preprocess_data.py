import os
from PIL import Image
import cv2
import numpy as np
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, datasets
from config import TRAIN_DIR, TEST_DIR, IMAGE_SIZE, BATCH_SIZE, EMOTION_MAP, CLASS_TO_IDX

class CLAHETransform:
    """
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE).
    This dramatically improves accuracy on webcam feeds by fixing bad lighting and shadows.
    """
    def __init__(self, clip_limit=2.0, tile_grid_size=(8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def __call__(self, img):
        # Convert PIL Image to numpy array
        img_np = np.array(img)
        # Apply CLAHE (assumes grayscale input, which it is after transforms.Grayscale)
        if len(img_np.shape) == 3:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        img_clahe = self.clahe.apply(img_np)
        return Image.fromarray(img_clahe)

class MappedEmotionDataset(Dataset):
    """
    Wraps an ImageFolder dataset to remap FER-2013 classes to the 5 learning-relevant states.
    """
    def __init__(self, root_dir, transform=None):
        # We load images using ImageFolder which automatically assigns classes based on subfolder names
        self.image_folder = datasets.ImageFolder(root=root_dir, transform=transform)
        self.transform = transform
        
        # ImageFolder's class_to_idx gives us the original FER classes (angry, disgust, etc.)
        self.fer_classes = {v: k for k, v in self.image_folder.class_to_idx.items()}
        
    def __len__(self):
        return len(self.image_folder)
        
    def __getitem__(self, idx):
        img, original_label = self.image_folder[idx]
        
        # Get original class name (e.g., 'angry')
        original_class_name = self.fer_classes[original_label]
        
        # Remap to learning class name (e.g., 'frustrated')
        learning_class_name = EMOTION_MAP[original_class_name]
        
        # Convert to learning class index
        mapped_label = CLASS_TO_IDX[learning_class_name]
        
        return img, mapped_label

def get_dataloaders():
    """
    Creates and returns DataLoaders for training and testing.
    Includes data augmentation for training.
    """
    # Stronger data augmentation for training to prevent overfitting
    train_transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        CLAHETransform(), # Apply Histogram Equalization
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    # Only normalization for testing
    test_transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        CLAHETransform(), # Ensure test set also gets fixed lighting
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    print(f"Loading training data from {TRAIN_DIR}...")
    train_dataset = MappedEmotionDataset(root_dir=TRAIN_DIR, transform=train_transform)
    
    print(f"Loading test data from {TEST_DIR}...")
    test_dataset = MappedEmotionDataset(root_dir=TEST_DIR, transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    return train_loader, test_loader, len(train_dataset), len(test_dataset)

if __name__ == "__main__":
    # Quick test to verify mapping
    train_loader, _, train_len, _ = get_dataloaders()
    print(f"Total training samples: {train_len}")
    
    # Get a single batch
    images, labels = next(iter(train_loader))
    print(f"Batch images shape: {images.shape}")
    print(f"Batch labels shape: {labels.shape}")
    print(f"Sample labels: {labels[:10]}")
