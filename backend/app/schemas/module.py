from __future__ import annotations
from typing import Optional, Union
"""Pydantic schemas for Module and Week API endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Week Schemas ─────────────────────────────────────────────

class WeekBase(BaseModel):
    week_number: int = Field(..., ge=1, le=15)
    topic: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subtopics: Optional[list[str]] = None


class WeekCreate(WeekBase):
    pass


class WeekResponse(WeekBase):
    id: uuid.UUID
    module_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Module Schemas ───────────────────────────────────────────

class ModuleBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=20, examples=["IT2060"])
    name: str = Field(..., min_length=2, max_length=255, examples=["Database Systems"])
    description: Optional[str] = None
    credits: int = Field(default=4, ge=1, le=8)
    lecturer: Optional[str] = None
    year: int = Field(..., ge=2020, le=2030)
    semester: int = Field(..., ge=1, le=2)
    department: Optional[str] = None
    assessment_structure: Optional[dict] = Field(
        default=None, examples=[{"exam": 60, "coursework": 40}]
    )


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None
    lecturer: Optional[str] = None
    assessment_structure: Optional[dict] = None


class ModuleResponse(ModuleBase):
    id: uuid.UUID
    outline_processed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModuleDetailResponse(ModuleResponse):
    """Module with nested learning outcomes and weeks."""

    learning_outcomes: list["LearningOutcomeResponse"] = []
    weeks: list[WeekResponse] = []


# ── Learning Outcome Schemas ─────────────────────────────────

class LearningOutcomeBase(BaseModel):
    lo_code: str = Field(..., examples=["LO1"])
    text: str = Field(..., min_length=10)
    bloom_level: str = Field(..., examples=["Apply"])
    bloom_verb: Optional[str] = None
    assessment_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    topic_keywords: Optional[list[str]] = None


class LearningOutcomeCreate(LearningOutcomeBase):
    pass


class LearningOutcomeResponse(LearningOutcomeBase):
    id: uuid.UUID
    module_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# Resolve forward reference
ModuleDetailResponse.model_rebuild()
