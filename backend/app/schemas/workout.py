from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.workout import ExerciseCategory


class ExerciseCreate(BaseModel):
    name: str
    category: ExerciseCategory = ExerciseCategory.STRENGTH
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_seconds: Optional[int] = None
    notes: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: int
    workout_id: int
    name: str
    category: ExerciseCategory
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_seconds: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WorkoutEntryCreate(BaseModel):
    name: str
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    logged_at: Optional[datetime] = None
    exercises: List[ExerciseCreate] = []


class WorkoutEntryUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    logged_at: Optional[datetime] = None


class WorkoutEntryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    logged_at: datetime
    created_at: datetime
    exercises: List[ExerciseResponse] = []

    class Config:
        from_attributes = True
