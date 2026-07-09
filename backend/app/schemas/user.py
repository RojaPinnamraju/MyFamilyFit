from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import GoalType, Gender


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    gender: Optional[Gender] = None
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    goal_type: Optional[GoalType] = None
    daily_calorie_goal: Optional[int] = None
    daily_water_goal_ml: Optional[int] = None
    avatar_color: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    age: Optional[int] = None
    height_cm: Optional[float] = None
    gender: Optional[Gender] = None
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    goal_type: Optional[GoalType] = None
    daily_calorie_goal: int
    daily_water_goal_ml: int
    avatar_color: str
    avatar_url: Optional[str] = None       # Google profile picture
    auth_provider: str = "local"           # "local" | "google"
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
