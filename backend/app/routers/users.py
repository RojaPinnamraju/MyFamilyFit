from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models.user import User
from app.models.weight import WeightEntry
from app.models.workout import WorkoutEntry
from app.models.meal import MealEntry
from app.models.water import WaterEntry
from app.schemas.user import UserResponse, UserProfileUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    update_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    # Today's calories and macros from meals
    today_meals = db.query(MealEntry).filter(
        MealEntry.user_id == current_user.id,
        MealEntry.logged_at >= today_start,
        MealEntry.logged_at <= today_end,
    ).all()

    calories_today = sum(m.total_calories for m in today_meals)
    protein_today = sum(m.total_protein for m in today_meals)

    # Today's water
    water_today = db.query(WaterEntry).filter(
        WaterEntry.user_id == current_user.id,
        WaterEntry.logged_at >= today_start,
        WaterEntry.logged_at <= today_end,
    ).all()
    water_ml_today = sum(w.amount_ml for w in water_today)

    # Today's workout
    workout_today = db.query(WorkoutEntry).filter(
        WorkoutEntry.user_id == current_user.id,
        WorkoutEntry.logged_at >= today_start,
        WorkoutEntry.logged_at <= today_end,
    ).first()

    # Weekly streak (days with at least one activity in last 7 days)
    streak = 0
    for i in range(7):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        has_activity = (
            db.query(WorkoutEntry).filter(
                WorkoutEntry.user_id == current_user.id,
                WorkoutEntry.logged_at >= day_start,
                WorkoutEntry.logged_at <= day_end,
            ).first()
            or db.query(MealEntry).filter(
                MealEntry.user_id == current_user.id,
                MealEntry.logged_at >= day_start,
                MealEntry.logged_at <= day_end,
            ).first()
        )
        if has_activity:
            streak += 1
        elif i > 0:
            break

    # Latest weight
    latest_weight = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id
    ).order_by(WeightEntry.logged_at.desc()).first()

    # Goal progress
    goal_progress = None
    if current_user.current_weight_kg and current_user.target_weight_kg and latest_weight:
        start = current_user.current_weight_kg
        target = current_user.target_weight_kg
        current = latest_weight.weight_kg
        if start != target:
            goal_progress = round(abs(start - current) / abs(start - target) * 100, 1)
            goal_progress = min(goal_progress, 100)

    return {
        "current_weight_kg": latest_weight.weight_kg if latest_weight else current_user.current_weight_kg,
        "target_weight_kg": current_user.target_weight_kg,
        "goal_type": current_user.goal_type,
        "goal_progress_pct": goal_progress,
        "weekly_streak": streak,
        "calories_today": calories_today,
        "calorie_goal": current_user.daily_calorie_goal,
        "protein_today_g": round(protein_today, 1),
        "water_today_ml": water_ml_today,
        "water_goal_ml": current_user.daily_water_goal_ml,
        "workout_done_today": workout_today is not None,
        "workout_name": workout_today.name if workout_today else None,
    }
