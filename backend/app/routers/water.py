from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime

from app.database import get_db
from app.models.water import WaterEntry
from app.models.user import User
from app.schemas.water import WaterEntryCreate, WaterEntryResponse, WaterSummary
from app.core.deps import get_current_user

router = APIRouter(prefix="/water", tags=["Water Tracking"])


@router.post("/", response_model=WaterEntryResponse, status_code=status.HTTP_201_CREATED)
def add_water(
    data: WaterEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = WaterEntry(user_id=current_user.id, amount_ml=data.amount_ml)
    if data.logged_at:
        entry.logged_at = data.logged_at
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/today", response_model=WaterSummary)
def get_today_water(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    day_start = datetime.combine(today, datetime.min.time())
    day_end = datetime.combine(today, datetime.max.time())

    entries = db.query(WaterEntry).filter(
        WaterEntry.user_id == current_user.id,
        WaterEntry.logged_at >= day_start,
        WaterEntry.logged_at <= day_end,
    ).order_by(WaterEntry.logged_at.desc()).all()

    total_ml = sum(e.amount_ml for e in entries)
    goal_ml = current_user.daily_water_goal_ml
    percentage = round((total_ml / goal_ml * 100) if goal_ml > 0 else 0, 1)

    return WaterSummary(
        total_ml=total_ml,
        goal_ml=goal_ml,
        percentage=min(percentage, 100),
        entries=entries,
    )


@router.get("/", response_model=List[WaterEntryResponse])
def list_water(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(WaterEntry).filter(
        WaterEntry.user_id == current_user.id
    ).order_by(WaterEntry.logged_at.desc()).offset(skip).limit(limit).all()


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(WaterEntry).filter(
        WaterEntry.id == entry_id,
        WaterEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()
