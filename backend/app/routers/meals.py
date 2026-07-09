from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date, datetime

from app.database import get_db
from app.models.meal import MealEntry, MealItem
from app.models.user import User
from app.schemas.meal import MealEntryCreate, MealEntryUpdate, MealEntryResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/meals", tags=["Meal Tracking"])


@router.post("/", response_model=MealEntryResponse, status_code=status.HTTP_201_CREATED)
def add_meal(
    data: MealEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = MealEntry(
        user_id=current_user.id,
        meal_type=data.meal_type,
        notes=data.notes,
    )
    if data.logged_at:
        meal.logged_at = data.logged_at
    db.add(meal)
    db.flush()

    for item_data in data.items:
        item = MealItem(
            meal_id=meal.id,
            name=item_data.name,
            quantity=item_data.quantity,
            calories=item_data.calories,
            protein_g=item_data.protein_g,
            carbs_g=item_data.carbs_g,
            fat_g=item_data.fat_g,
        )
        db.add(item)

    db.commit()
    return db.query(MealEntry).options(
        joinedload(MealEntry.items)
    ).filter(MealEntry.id == meal.id).first()


@router.get("/", response_model=List[MealEntryResponse])
def list_meals(
    skip: int = 0,
    limit: int = 50,
    date_filter: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MealEntry).options(
        joinedload(MealEntry.items)
    ).filter(MealEntry.user_id == current_user.id)

    if date_filter:
        day_start = datetime.combine(date_filter, datetime.min.time())
        day_end = datetime.combine(date_filter, datetime.max.time())
        query = query.filter(
            MealEntry.logged_at >= day_start,
            MealEntry.logged_at <= day_end,
        )

    return query.order_by(MealEntry.logged_at.desc()).offset(skip).limit(limit).all()


@router.get("/{meal_id}", response_model=MealEntryResponse)
def get_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(MealEntry).options(
        joinedload(MealEntry.items)
    ).filter(
        MealEntry.id == meal_id,
        MealEntry.user_id == current_user.id,
    ).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
    return meal


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(MealEntry).filter(
        MealEntry.id == meal_id,
        MealEntry.user_id == current_user.id,
    ).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
    db.delete(meal)
    db.commit()
