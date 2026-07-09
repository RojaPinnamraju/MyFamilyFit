from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WaterEntryCreate(BaseModel):
    amount_ml: int
    logged_at: Optional[datetime] = None


class WaterEntryResponse(BaseModel):
    id: int
    user_id: int
    amount_ml: int
    logged_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class WaterSummary(BaseModel):
    total_ml: int
    goal_ml: int
    percentage: float
    entries: list[WaterEntryResponse] = []
