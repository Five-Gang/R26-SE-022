import numpy as np
from enum import IntEnum

class Action(IntEnum):
    SEND  = 0
    DELAY = 1
    SKIP  = 2

REWARD_MAP = {"ACCEPTED": 1.0, "SNOOZED": 0.0, "DISMISSED": -1.0}

class LinUCB:
    """
    Linear Upper Confidence Bound contextual bandit.
    One linear model per action. Picks the action with highest UCB.
    """
    def __init__(self, n_actions: int = 3, context_dim: int = 9, alpha: float = 1.0):
        self.alpha = alpha
        self.n = n_actions
        self.d = context_dim
        self.A = [np.eye(self.d)    for _ in range(n_actions)]
        self.b = [np.zeros(self.d)  for _ in range(n_actions)]

    def select(self, context: np.ndarray) -> tuple[Action, list[float]]:
        x = context.reshape(-1, 1)
        ucbs = []
        for a in range(self.n):
            A_inv = np.linalg.inv(self.A[a])
            theta = A_inv @ self.b[a]
            mean  = float(theta @ context)
            bonus = self.alpha * float(np.sqrt(context @ A_inv @ context))
            ucbs.append(mean + bonus)
        return Action(int(np.argmax(ucbs))), ucbs

    def update(self, context: np.ndarray, action: Action, reward: float) -> None:
        x = context.reshape(-1, 1)
        self.A[int(action)] += x @ x.T
        self.b[int(action)] += reward * context

def build_context(
    readiness_score: float,
    item_priority: float,
    hour_of_day: int,
    minutes_since_last_reminder: float,
    recent_accept_rate: float,
    engagement_score: float,
    activity_learning_score: float,
) -> np.ndarray:
    """
    9-dim context vector for LinUCB.
    Hour encoded cyclically so 23:00 is close to 00:00 in feature space.
    """
    return np.array([
        readiness_score,
        item_priority,
        np.sin(2 * np.pi * hour_of_day / 24),
        np.cos(2 * np.pi * hour_of_day / 24),
        min(minutes_since_last_reminder / 240.0, 1.0),   # cap at 4 hours
        recent_accept_rate,
        engagement_score,
        activity_learning_score,
        1.0,                                               # bias term
    ])
