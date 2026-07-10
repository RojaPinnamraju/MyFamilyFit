from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date
from app.models.medication import FoodTiming, MedLogStatus


class MedicationCreate(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: str                      # "once_daily" | "twice_daily" | "three_times_daily" | "as_needed"
    reminder_times: List[str] = []      # ["08:00", "20:00"]
    food_timing: FoodTiming = FoodTiming.ANY
    notes: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Medication name cannot be empty")
        return v.strip()


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    reminder_times: Optional[List[str]] = None
    food_timing: Optional[FoodTiming] = None
    notes: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class MedicationResponse(BaseModel):
    id: int
    user_id: int
    name: str
    dosage: Optional[str] = None
    frequency: str
    reminder_times: List[str]
    food_timing: FoodTiming
    notes: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Logs ─────────────────────────────────────────────────────────────────────
class MedicationLogCreate(BaseModel):
    log_date: date
    reminder_time: Optional[str] = None
    status: MedLogStatus
    notes: Optional[str] = None


class MedicationLogResponse(BaseModel):
    id: int
    medication_id: int
    user_id: int
    log_date: date
    reminder_time: Optional[str] = None
    status: MedLogStatus
    notes: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


# ── Today's schedule item ─────────────────────────────────────────────────────
class TodayMedItem(BaseModel):
    medication_id: int
    name: str
    dosage: Optional[str]
    reminder_time: str
    food_timing: FoodTiming
    log_id: Optional[int] = None
    status: Optional[MedLogStatus] = None   # None = pending
