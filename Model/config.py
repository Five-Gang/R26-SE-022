import os

# Dataset paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Data", "archive")
TRAIN_DIR = os.path.join(DATA_DIR, "train")
TEST_DIR = os.path.join(DATA_DIR, "test")

# Model configuration
IMAGE_SIZE = 48  # FER-2013 images are 48x48
BATCH_SIZE = 64
NUM_CLASSES = 5  # We are mapping 7 FER classes to 5 learning-relevant states
EPOCHS = 30
LEARNING_RATE = 0.001

# Emotion mapping: FER-2013 -> Learning-Relevant
# FER-2013: angry, disgust, fear, happy, neutral, sad, surprise
# Learning: focused(0), confused(1), frustrated(2), bored(3), neutral(4)

EMOTION_MAP = {
    "angry": "frustrated",
    "disgust": "frustrated",
    "fear": "confused",
    "surprise": "confused",
    "happy": "focused",
    "sad": "bored",
    "neutral": "neutral"
}

LEARNING_EMOTIONS = ["focused", "confused", "frustrated", "bored", "neutral"]
CLASS_TO_IDX = {emo: idx for idx, emo in enumerate(LEARNING_EMOTIONS)}
IDX_TO_CLASS = {idx: emo for emo, idx in CLASS_TO_IDX.items()}

# Model saving path
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "emotion_model.pth")
