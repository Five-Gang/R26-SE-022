import numpy as np

def calculate_ear(eye_landmarks):
    """
    Calculates the Eye Aspect Ratio (EAR) based on 6 landmark points around the eye.
    EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    
    Args:
        eye_landmarks (list): List of 6 (x, y) coordinates for the eye landmarks.
                              Order: [left, top_right, bottom_right, right, bottom_left, top_left]
                              Actually standard MediaPipe order needs specific indices.
                              We'll pass the 6 points in the correct order:
                              0: left corner
                              1: top left
                              2: top right
                              3: right corner
                              4: bottom right
                              5: bottom left
    Returns:
        float: EAR value
    """
    # Vertical distances
    v1 = np.linalg.norm(np.array(eye_landmarks[1]) - np.array(eye_landmarks[5]))
    v2 = np.linalg.norm(np.array(eye_landmarks[2]) - np.array(eye_landmarks[4]))
    
    # Horizontal distance
    h = np.linalg.norm(np.array(eye_landmarks[0]) - np.array(eye_landmarks[3]))
    
    if h == 0.0:
        return 0.0
        
    ear = (v1 + v2) / (2.0 * h)
    return ear
