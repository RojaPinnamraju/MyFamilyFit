from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WeightEntryCreate(BaseModel):
    weight_kg: float
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


class WeightEntryUpdate(BaseModel):
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


class WeightEntryResponse(BaseModel):
    id: int
    user_id: int
    weight_kg: float
    notes: Optional[str] = None
    logged_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
