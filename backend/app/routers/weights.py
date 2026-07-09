from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.weight import WeightEntry
from app.models.user import User
from app.schemas.weight import WeightEntryCreate, WeightEntryUpdate, WeightEntryResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/weights", tags=["Weight Tracking"])


@router.post("/", response_model=WeightEntryResponse, status_code=status.HTTP_201_CREATED)
def add_weight(
    data: WeightEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = WeightEntry(
        user_id=current_user.id,
        weight_kg=data.weight_kg,
        notes=data.notes,
    )
    if data.logged_at:
        entry.logged_at = data.logged_at
    db.add(entry)

    # Update user's current weight
    current_user.current_weight_kg = data.weight_kg
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=List[WeightEntryResponse])
def list_weights(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id
    ).order_by(WeightEntry.logged_at.desc()).offset(skip).limit(limit).all()


@router.patch("/{entry_id}", response_model=WeightEntryResponse)
def update_weight(
    entry_id: int,
    data: WeightEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(WeightEntry).filter(
        WeightEntry.id == entry_id,
        WeightEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(WeightEntry).filter(
        WeightEntry.id == entry_id,
        WeightEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()
