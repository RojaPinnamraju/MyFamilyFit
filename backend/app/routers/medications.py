from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.medication import Medication, MedicationLog
from app.schemas.medication import (
    MedicationCreate, MedicationUpdate, MedicationResponse,
    MedicationLogCreate, MedicationLogResponse, TodayMedItem,
)
from app.core.deps import get_current_user
from app.services.push import send_push_notification

router = APIRouter(prefix="/medications", tags=["Medications"])


def _normalize_times(times: list[str]) -> list[str]:
    """Ensure all reminder times are zero-padded HH:MM so '3:20' → '03:20'."""
    result = []
    for t in (times or []):
        parts = t.strip().split(":")
        if len(parts) == 2:
            try:
                result.append(f"{int(parts[0]):02d}:{int(parts[1]):02d}")
            except ValueError:
                pass
    return result


# ── CRUD ──────────────────────────────────────────────────────────────────────
@router.get("", response_model=List[MedicationResponse])
def list_medications(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Medication).filter(Medication.user_id == current_user.id)
    if active_only:
        q = q.filter(Medication.is_active == True)
    return q.order_by(Medication.name).all()


@router.post("", response_model=MedicationResponse, status_code=201)
def create_medication(
    data: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    payload["reminder_times"] = _normalize_times(payload.get("reminder_times") or [])
    med = Medication(user_id=current_user.id, **payload)
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.get("/today", response_model=List[TodayMedItem])
def get_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    meds = (
        db.query(Medication)
        .filter(
            Medication.user_id == current_user.id,
            Medication.is_active == True,
        )
        .all()
    )

    # Get today's logs keyed by (med_id, reminder_time)
    logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.user_id == current_user.id,
            MedicationLog.log_date == today,
        )
        .all()
    )
    log_map = {(l.medication_id, l.reminder_time): l for l in logs}

    items: List[TodayMedItem] = []
    for med in meds:
        times = med.reminder_times or ["08:00"]
        for t in times:
            log = log_map.get((med.id, t))
            items.append(TodayMedItem(
                medication_id=med.id,
                name=med.name,
                dosage=med.dosage,
                reminder_time=t,
                food_timing=med.food_timing,
                log_id=log.id if log else None,
                status=log.status if log else None,
            ))

    items.sort(key=lambda x: x.reminder_time)
    return items


@router.get("/{med_id}", response_model=MedicationResponse)
def get_medication(
    med_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == current_user.id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med


@router.patch("/{med_id}", response_model=MedicationResponse)
def update_medication(
    med_id: int,
    data: MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == current_user.id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    updates = data.model_dump(exclude_unset=True)
    if "reminder_times" in updates:
        updates["reminder_times"] = _normalize_times(updates["reminder_times"])
    for field, value in updates.items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med


@router.delete("/{med_id}", status_code=204)
def delete_medication(
    med_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == current_user.id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()


# ── Logs ──────────────────────────────────────────────────────────────────────
@router.post("/{med_id}/logs", response_model=MedicationLogResponse, status_code=201)
def log_medication(
    med_id: int,
    data: MedicationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == current_user.id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Upsert: one log per (med, date, reminder_time)
    existing = db.query(MedicationLog).filter(
        MedicationLog.medication_id == med_id,
        MedicationLog.user_id == current_user.id,
        MedicationLog.log_date == data.log_date,
        MedicationLog.reminder_time == data.reminder_time,
    ).first()

    if existing:
        existing.status = data.status
        existing.notes = data.notes
        db.commit()
        db.refresh(existing)
        return existing

    log = MedicationLog(
        medication_id=med_id,
        user_id=current_user.id,
        **data.model_dump(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{med_id}/logs", response_model=List[MedicationLogResponse])
def get_medication_logs(
    med_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta
    since = date.today() - timedelta(days=days)
    return (
        db.query(MedicationLog)
        .filter(
            MedicationLog.medication_id == med_id,
            MedicationLog.user_id == current_user.id,
            MedicationLog.log_date >= since,
        )
        .order_by(MedicationLog.log_date.desc(), MedicationLog.reminder_time)
        .all()
    )


# ── Test / manual trigger ──────────────────────────────────────────────────────
@router.post("/{med_id}/test-reminder", status_code=200)
def test_reminder(
    med_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test push notification for this medication right now."""
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == current_user.id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    token = current_user.push_token
    if not token:
        return {"sent": False, "reason": "No push token registered on this device"}

    food_hint = {"before": "Before food", "after": "After food", "with": "With food"}.get(
        med.food_timing, ""
    )
    body_parts = [p for p in [med.dosage, food_hint] if p]

    sent = send_push_notification(
        token=token,
        title=f"💊 {med.name} (test)",
        body=" · ".join(body_parts) if body_parts else "Test reminder",
        data={"type": "medication_test", "medication_id": med.id},
    )
    return {"sent": sent}
