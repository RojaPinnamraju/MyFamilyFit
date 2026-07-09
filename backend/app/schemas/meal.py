from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.meal import MealType


class MealItemCreate(BaseModel):
    name: str
    quantity: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class MealItemResponse(BaseModel):
    id: int
    meal_id: int
    name: str
    quantity: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None

    class Config:
        from_attributes = True


class MealEntryCreate(BaseModel):
    meal_type: MealType
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None
    items: List[MealItemCreate] = []


class MealEntryUpdate(BaseModel):
    meal_type: Optional[MealType] = None
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


class MealEntryResponse(BaseModel):
    id: int
    user_id: int
    meal_type: MealType
    notes: Optional[str] = None
    logged_at: datetime
    created_at: datetime
    items: List[MealItemResponse] = []
    total_calories: int
    total_protein: float
    total_carbs: float
    total_fat: float

    class Config:
        from_attributes = True
