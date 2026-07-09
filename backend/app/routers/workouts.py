from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.workout import WorkoutEntry, Exercise
from app.models.user import User
from app.schemas.workout import WorkoutEntryCreate, WorkoutEntryUpdate, WorkoutEntryResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workout Tracking"])


@router.post("/", response_model=WorkoutEntryResponse, status_code=status.HTTP_201_CREATED)
def add_workout(
    data: WorkoutEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = WorkoutEntry(
        user_id=current_user.id,
        name=data.name,
        notes=data.notes,
        duration_minutes=data.duration_minutes,
    )
    if data.logged_at:
        workout.logged_at = data.logged_at
    db.add(workout)
    db.flush()

    for ex_data in data.exercises:
        exercise = Exercise(
            workout_id=workout.id,
            name=ex_data.name,
            category=ex_data.category,
            sets=ex_data.sets,
            reps=ex_data.reps,
            weight_kg=ex_data.weight_kg,
            duration_seconds=ex_data.duration_seconds,
            notes=ex_data.notes,
        )
        db.add(exercise)

    db.commit()
    return db.query(WorkoutEntry).options(
        joinedload(WorkoutEntry.exercises)
    ).filter(WorkoutEntry.id == workout.id).first()


@router.get("/", response_model=List[WorkoutEntryResponse])
def list_workouts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(WorkoutEntry).options(
        joinedload(WorkoutEntry.exercises)
    ).filter(
        WorkoutEntry.user_id == current_user.id
    ).order_by(WorkoutEntry.logged_at.desc()).offset(skip).limit(limit).all()


@router.get("/{workout_id}", response_model=WorkoutEntryResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(WorkoutEntry).options(
        joinedload(WorkoutEntry.exercises)
    ).filter(
        WorkoutEntry.id == workout_id,
        WorkoutEntry.user_id == current_user.id,
    ).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return workout


@router.patch("/{workout_id}", response_model=WorkoutEntryResponse)
def update_workout(
    workout_id: int,
    data: WorkoutEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(WorkoutEntry).filter(
        WorkoutEntry.id == workout_id,
        WorkoutEntry.user_id == current_user.id,
    ).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(workout, field, value)
    db.commit()
    return db.query(WorkoutEntry).options(
        joinedload(WorkoutEntry.exercises)
    ).filter(WorkoutEntry.id == workout_id).first()


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.query(WorkoutEntry).filter(
        WorkoutEntry.id == workout_id,
        WorkoutEntry.user_id == current_user.id,
    ).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    db.delete(workout)
    db.commit()
