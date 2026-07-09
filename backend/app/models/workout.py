from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ExerciseCategory(str, enum.Enum):
    STRENGTH = "strength"
    CARDIO = "cardio"
    FLEXIBILITY = "flexibility"
    SPORTS = "sports"
    OTHER = "other"


class WorkoutEntry(Base):
    __tablename__ = "workout_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="workout_entries")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workout_entries.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(Enum(ExerciseCategory), default=ExerciseCategory.STRENGTH)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    workout = relationship("WorkoutEntry", back_populates="exercises")
