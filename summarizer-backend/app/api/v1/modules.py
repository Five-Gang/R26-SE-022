from __future__ import annotations
from typing import Optional, Union
"""Module CRUD API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import LearningOutcome, Module, Week
from app.schemas import (
    LearningOutcomeCreate,
    LearningOutcomeResponse,
    ModuleCreate,
    ModuleDetailResponse,
    ModuleResponse,
    ModuleUpdate,
    WeekCreate,
    WeekResponse,
)

router = APIRouter()


@router.post("", response_model=ModuleResponse, status_code=201)
async def create_module(data: ModuleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new module."""
    # Check for duplicate code
    existing = await db.execute(select(Module).where(Module.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Module {data.code} already exists")

    module = Module(**data.model_dump())
    db.add(module)
    await db.flush()
    await db.refresh(module)
    return module


@router.get("", response_model=list[ModuleResponse])
async def list_modules(
    department: Optional[str] = None,
    year: Optional[int] = None,
    semester: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all modules with optional filtering."""
    query = select(Module).order_by(Module.code)
    if department:
        query = query.where(Module.department == department)
    if year:
        query = query.where(Module.year == year)
    if semester:
        query = query.where(Module.semester == semester)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{module_id}", response_model=ModuleDetailResponse)
async def get_module(module_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get module details with learning outcomes and weeks."""
    result = await db.execute(
        select(Module)
        .where(Module.id == module_id)
        .options(selectinload(Module.learning_outcomes), selectinload(Module.weeks))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module


@router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: uuid.UUID, data: ModuleUpdate, db: AsyncSession = Depends(get_db)
):
    """Update module details."""
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(module, field, value)

    await db.flush()
    await db.refresh(module)
    return module


@router.delete("/{module_id}", status_code=204)
async def delete_module(module_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a module and all associated data."""
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    await db.delete(module)


# ── Learning Outcomes ────────────────────────────────────────

@router.get("/{module_id}/learning-outcomes", response_model=list[LearningOutcomeResponse])
async def get_learning_outcomes(module_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get all learning outcomes for a module."""
    result = await db.execute(
        select(LearningOutcome)
        .where(LearningOutcome.module_id == module_id)
        .order_by(LearningOutcome.lo_code)
    )
    return result.scalars().all()


@router.post(
    "/{module_id}/learning-outcomes",
    response_model=LearningOutcomeResponse,
    status_code=201,
)
async def create_learning_outcome(
    module_id: uuid.UUID,
    data: LearningOutcomeCreate,
    db: AsyncSession = Depends(get_db),
):
    """Manually add a learning outcome to a module."""
    # Verify module exists
    module = await db.execute(select(Module).where(Module.id == module_id))
    if not module.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    lo = LearningOutcome(module_id=module_id, **data.model_dump())
    db.add(lo)
    await db.flush()
    await db.refresh(lo)
    return lo


# ── Weeks ────────────────────────────────────────────────────

@router.get("/{module_id}/weeks", response_model=list[WeekResponse])
async def get_weeks(module_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get all weeks for a module."""
    result = await db.execute(
        select(Week).where(Week.module_id == module_id).order_by(Week.week_number)
    )
    return result.scalars().all()


@router.post("/{module_id}/weeks", response_model=WeekResponse, status_code=201)
async def create_week(
    module_id: uuid.UUID, data: WeekCreate, db: AsyncSession = Depends(get_db)
):
    """Add a week to a module."""
    module = await db.execute(select(Module).where(Module.id == module_id))
    if not module.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    week = Week(module_id=module_id, **data.model_dump())
    db.add(week)
    await db.flush()
    await db.refresh(week)
    return week
