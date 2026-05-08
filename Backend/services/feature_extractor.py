import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import os
from services.ear_calculator import calculate_ear

class FeatureExtractor:
    def __init__(self):
        # MediaPipe Tasks API setup
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, 'face_landmarker.task')
        
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)
        
        # MediaPipe Landmark Indices
        # Left Eye (from user perspective, so right side of image)
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        # Right Eye
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        # Mouth
        self.MOUTH_TOP = 13
        self.MOUTH_BOTTOM = 14
        self.MOUTH_LEFT = 78
        self.MOUTH_RIGHT = 308
        # Eyebrows
        self.LEFT_EYEBROW = 105
        self.RIGHT_EYEBROW = 334
        self.NOSE_TIP = 1

    def extract_features(self, image):
        """
        Extracts facial features and metrics from an image using MediaPipe.
        Args:
            image: numpy array (BGR image from OpenCV)
        Returns:
            dict: Extracted features, or None if no face detected
        """
        # Convert BGR to RGB and create mp.Image
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        # Process the image
        results = self.landmarker.detect(mp_image)
        
        if not results.face_landmarks:
            return None
            
        landmarks = results.face_landmarks[0]
        
        # Get image dimensions for normalized coordinates conversion
        h, w, _ = image.shape
        
        def get_pt(idx):
            return [landmarks[idx].x * w, landmarks[idx].y * h]
            
        # 1. Calculate EAR
        left_eye_pts = [get_pt(i) for i in self.LEFT_EYE]
        right_eye_pts = [get_pt(i) for i in self.RIGHT_EYE]
        
        ear_left = calculate_ear(left_eye_pts)
        ear_right = calculate_ear(right_eye_pts)
        avg_ear = (ear_left + ear_right) / 2.0
        
        # 2. Calculate Mouth Opening
        mouth_top = get_pt(self.MOUTH_TOP)
        mouth_bottom = get_pt(self.MOUTH_BOTTOM)
        mouth_height = np.linalg.norm(np.array(mouth_top) - np.array(mouth_bottom))
        
        mouth_left = get_pt(self.MOUTH_LEFT)
        mouth_right = get_pt(self.MOUTH_RIGHT)
        mouth_width = np.linalg.norm(np.array(mouth_left) - np.array(mouth_right))
        
        mouth_opening_ratio = mouth_height / mouth_width if mouth_width > 0 else 0
        
        # 3. Head Tilt (simplified using nose and eyes)
        left_eye_center = np.mean(left_eye_pts, axis=0)
        right_eye_center = np.mean(right_eye_pts, axis=0)
        
        dy = right_eye_center[1] - left_eye_center[1]
        dx = right_eye_center[0] - left_eye_center[0]
        angle = np.degrees(np.arctan2(dy, dx))
        # Normal straight face has angle ~0
        head_tilt = angle
        
        # 4. Eyebrow Distance (from nose tip) & Asymmetry
        nose_tip = get_pt(self.NOSE_TIP)
        left_eyebrow = get_pt(self.LEFT_EYEBROW)
        right_eyebrow = get_pt(self.RIGHT_EYEBROW)
        
        dist_left_eyebrow = np.linalg.norm(np.array(left_eyebrow) - np.array(nose_tip))
        dist_right_eyebrow = np.linalg.norm(np.array(right_eyebrow) - np.array(nose_tip))
        avg_eyebrow_dist = (dist_left_eyebrow + dist_right_eyebrow) / (2.0 * h) # normalize by height
        
        eyebrow_asymmetry = abs(left_eyebrow[1] - right_eyebrow[1]) / h
        
        # 5. Face Bounding Box (Normalized)
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]
        bbox = {
            "xMin": min(x_coords),
            "yMin": min(y_coords),
            "xMax": max(x_coords),
            "yMax": max(y_coords)
        }

        # Construct feature vector
        features = {
            "ear_left": ear_left,
            "ear_right": ear_right,
            "eye_openness": avg_ear,
            "mouth_opening": mouth_opening_ratio,
            "head_tilt": head_tilt,
            "eyebrow_distance": avg_eyebrow_dist,
            # NEW V2 FEATURES:
            "mouth_width": mouth_width / w,
            "mouth_height": mouth_height / h,
            "eyebrow_asymmetry": eyebrow_asymmetry,
            # Approximating blink (EAR < 0.2 usually indicates a blink, but threshold might vary)
            "is_blinking": bool(avg_ear < 0.21),
            "bounding_box": bbox
        }
        
        return features

    def get_face_crop(self, image):
        """
        Returns a cropped grayscale face image suitable for the CNN model.
        Returns: crop (48x48 numpy array), or None
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        results = self.landmarker.detect(mp_image)
        
        if not results.face_landmarks:
            return None
            
        landmarks = results.face_landmarks[0]
        h, w, _ = image.shape
        
        # Get bounding box
        x_coords = [lm.x * w for lm in landmarks]
        y_coords = [lm.y * h for lm in landmarks]
        
        x_min, x_max = int(min(x_coords)), int(max(x_coords))
        y_min, y_max = int(min(y_coords)), int(max(y_coords))
        
        # Add padding
        pad_x = int((x_max - x_min) * 0.1)
        pad_y = int((y_max - y_min) * 0.1)
        
        x_min = max(0, x_min - pad_x)
        y_min = max(0, y_min - pad_y)
        x_max = min(w, x_max + pad_x)
        y_max = min(h, y_max + pad_y)
        
        face_crop = image[y_min:y_max, x_min:x_max]
        if face_crop.size == 0:
            return None
            
        # Convert to grayscale
        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) 
        # to dramatically improve robustness against poor webcam lighting
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        clahe_crop = clahe.apply(gray_crop)
        
        # Resize to 48x48 for the CNN
        resized_crop = cv2.resize(clahe_crop, (48, 48))
        
        return resized_crop
