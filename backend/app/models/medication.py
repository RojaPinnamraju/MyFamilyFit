from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, Boolean, JSON, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class FoodTiming(str, enum.Enum):
    BEFORE = "before"
    AFTER  = "after"
    WITH   = "with"
    ANY    = "any"


class MedLogStatus(str, enum.Enum):
    TAKEN   = "taken"
    SKIPPED = "skipped"


class Medication(Base):
    __tablename__ = "medications"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    name         = Column(String, nullable=False)
    dosage       = Column(String, nullable=True)          # e.g. "10mg", "1 tablet"
    frequency    = Column(String, nullable=False)         # e.g. "once_daily", "twice_daily"
    reminder_times = Column(JSON, nullable=False, default=list)  # ["08:00", "20:00"]
    food_timing  = Column(Enum(FoodTiming), default=FoodTiming.ANY, nullable=False)
    notes        = Column(String, nullable=True)
    start_date   = Column(Date, nullable=True)
    end_date     = Column(Date, nullable=True)
    is_active    = Column(Boolean, default=True, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="medications")
    logs = relationship("MedicationLog", back_populates="medication", cascade="all, delete-orphan")


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id            = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    log_date      = Column(Date, nullable=False)
    reminder_time = Column(String, nullable=True)   # which scheduled time this log is for
    status        = Column(Enum(MedLogStatus), nullable=False)
    notes         = Column(String, nullable=True)
    logged_at     = Column(DateTime(timezone=True), server_default=func.now())

    medication = relationship("Medication", back_populates="logs")
