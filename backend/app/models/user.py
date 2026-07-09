from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class GoalType(str, enum.Enum):
    LOSE_WEIGHT = "lose_weight"
    GAIN_MUSCLE = "gain_muscle"
    MAINTAIN = "maintain"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Profile
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    current_weight_kg = Column(Float, nullable=True)
    target_weight_kg = Column(Float, nullable=True)
    goal_type = Column(Enum(GoalType), nullable=True)
    daily_calorie_goal = Column(Integer, default=2000)
    daily_water_goal_ml = Column(Integer, default=2500)
    avatar_color = Column(String, default="#6366f1")

    # OAuth
    google_id     = Column(String, unique=True, nullable=True, index=True)
    avatar_url    = Column(String, nullable=True)   # Google profile picture URL
    auth_provider = Column(String, default="local", nullable=False)  # "local" | "google"

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    family_memberships = relationship("FamilyMember", back_populates="user")
    weight_entries = relationship("WeightEntry", back_populates="user", cascade="all, delete-orphan")
    workout_entries = relationship("WorkoutEntry", back_populates="user", cascade="all, delete-orphan")
    meal_entries = relationship("MealEntry", back_populates="user", cascade="all, delete-orphan")
    water_entries = relationship("WaterEntry", back_populates="user", cascade="all, delete-orphan")
