"""LinUCB contextual bandit for reminder actions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import math
from typing import Any, Mapping

import numpy as np


class BanditValidationError(ValueError):
    """Raised when a bandit context, action, or state is invalid."""


class ReminderAction:
    SEND = "SEND"
    DELAY = "DELAY"
    SKIP = "SKIP"

    ALL = (SEND, DELAY, SKIP)


@dataclass(frozen=True)
class BanditContext:
    """Ten-dimensional context used by the reminder policy."""

    readiness_score: float
    retention_probability: float
    priority_score: float
    time_sin: float
    time_cos: float
    time_since_reminder: float
    acceptance_rate: float
    dismissal_rate: float
    engagement_score: float
    bias: float = 1.0

    def vector(self) -> np.ndarray:
        values = np.array(
            [
                self.readiness_score,
                self.retention_probability,
                self.priority_score,
                self.time_sin,
                self.time_cos,
                self.time_since_reminder,
                self.acceptance_rate,
                self.dismissal_rate,
                self.engagement_score,
                self.bias,
            ],
            dtype=float,
        )
        if values.shape != (10,) or not np.all(np.isfinite(values)):
            raise BanditValidationError("Context must contain ten finite numeric features")
        if not 0.0 <= self.readiness_score <= 1.0:
            raise BanditValidationError("readiness_score must be between 0 and 1")
        if not 0.0 <= self.retention_probability <= 1.0:
            raise BanditValidationError("retention_probability must be between 0 and 1")
        if self.time_since_reminder < 0:
            raise BanditValidationError("time_since_reminder must be non-negative")
        for name in ("acceptance_rate", "dismissal_rate", "engagement_score"):
            value = getattr(self, name)
            if not 0.0 <= value <= 1.0:
                raise BanditValidationError(f"{name} must be between 0 and 1")
        return values

    def to_dict(self) -> dict[str, float]:
        return {
            "readiness_score": self.readiness_score,
            "retention_probability": self.retention_probability,
            "priority_score": self.priority_score,
            "time_sin": self.time_sin,
            "time_cos": self.time_cos,
            "time_since_reminder": self.time_since_reminder,
            "acceptance_rate": self.acceptance_rate,
            "dismissal_rate": self.dismissal_rate,
            "engagement_score": self.engagement_score,
            "bias": self.bias,
        }

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "BanditContext":
        required = (
            "readiness_score",
            "retention_probability",
            "priority_score",
            "time_sin",
            "time_cos",
            "time_since_reminder",
            "acceptance_rate",
            "dismissal_rate",
            "engagement_score",
        )
        missing = [name for name in required if name not in values]
        if missing:
            raise BanditValidationError(
                f"Context is missing required features: {', '.join(missing)}"
            )
        context = cls(
            **{name: float(values[name]) for name in required},
            bias=float(values.get("bias", 1.0)),
        )
        context.vector()
        return context

    @classmethod
    def from_time(
        cls,
        *,
        readiness_score: float,
        retention_probability: float,
        priority_score: float,
        time_since_reminder: float,
        acceptance_rate: float,
        dismissal_rate: float,
        engagement_score: float,
        at: datetime,
    ) -> "BanditContext":
        hour = at.hour + (at.minute / 60.0)
        angle = 2.0 * math.pi * hour / 24.0
        return cls(
            readiness_score=readiness_score,
            retention_probability=retention_probability,
            priority_score=priority_score,
            time_sin=math.sin(angle),
            time_cos=math.cos(angle),
            time_since_reminder=time_since_reminder,
            acceptance_rate=acceptance_rate,
            dismissal_rate=dismissal_rate,
            engagement_score=engagement_score,
        )


class LinUCB:
    """Per-policy LinUCB model with one linear estimator per action."""

    def __init__(self, alpha: float = 1.0, dimension: int = 10) -> None:
        if not math.isfinite(alpha) or alpha < 0:
            raise BanditValidationError("alpha must be a finite non-negative number")
        if dimension != 10:
            raise BanditValidationError("LinUCB requires a ten-feature context")
        self.alpha = float(alpha)
        self.dimension = dimension
        self._a = {action: np.eye(dimension) for action in ReminderAction.ALL}
        self._b = {action: np.zeros(dimension) for action in ReminderAction.ALL}

    def select_action(self, context: BanditContext) -> str:
        vector = context.vector()
        scores = {}
        for action in ReminderAction.ALL:
            theta = np.linalg.solve(self._a[action], self._b[action])
            bonus = self.alpha * math.sqrt(
                float(vector @ np.linalg.solve(self._a[action], vector))
            )
            scores[action] = float(theta @ vector) + bonus
        return max(ReminderAction.ALL, key=lambda action: scores[action])

    def update(self, action: str, context: BanditContext, reward: float) -> None:
        if action not in ReminderAction.ALL:
            raise BanditValidationError(f"Unknown reminder action: {action}")
        if not math.isfinite(reward):
            raise BanditValidationError("reward must be finite")
        vector = context.vector()
        self._a[action] += np.outer(vector, vector)
        self._b[action] += float(reward) * vector

    def to_dict(self) -> dict[str, Any]:
        return {
            "alpha": self.alpha,
            "dimension": self.dimension,
            "actions": {
                action: {
                    "a": self._a[action].tolist(),
                    "b": self._b[action].tolist(),
                }
                for action in ReminderAction.ALL
            },
        }

    @classmethod
    def from_dict(cls, state: Mapping[str, Any]) -> "LinUCB":
        try:
            model = cls(alpha=float(state["alpha"]), dimension=int(state["dimension"]))
            actions = state["actions"]
            for action in ReminderAction.ALL:
                action_state = actions[action]
                matrix = np.asarray(action_state["a"], dtype=float)
                vector = np.asarray(action_state["b"], dtype=float)
                if matrix.shape != (model.dimension, model.dimension):
                    raise BanditValidationError(f"Invalid A matrix for action {action}")
                if vector.shape != (model.dimension,):
                    raise BanditValidationError(f"Invalid b vector for action {action}")
                if not np.all(np.isfinite(matrix)) or not np.all(np.isfinite(vector)):
                    raise BanditValidationError("Bandit state must contain finite values")
                model._a[action] = matrix
                model._b[action] = vector
            return model
        except (KeyError, TypeError, ValueError, np.linalg.LinAlgError) as exc:
            if isinstance(exc, BanditValidationError):
                raise
            raise BanditValidationError("Invalid LinUCB state") from exc
