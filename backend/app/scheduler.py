"""
Background scheduler — sends medication reminder push notifications.

Runs a job every minute that:
  1. Gets the current HH:MM
  2. Finds active medications with that time in reminder_times
  3. Skips any already logged as taken/skipped today
  4. Sends an Expo push notification to the user's device
"""
import logging
import os
from datetime import date, datetime

import pytz
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

# Read timezone from env — defaults to Pacific time
_TZ_NAME = os.environ.get("TIMEZONE", "America/Los_Angeles")
try:
    APP_TZ = pytz.timezone(_TZ_NAME)
except pytz.UnknownTimeZoneError:
    logger.warning("Unknown timezone %r, falling back to UTC", _TZ_NAME)
    APP_TZ = pytz.utc

scheduler = BackgroundScheduler(timezone=APP_TZ, job_defaults={"misfire_grace_time": 60})


def _check_med_reminders() -> None:
    """Called every minute by APScheduler."""
    # Import inside function to avoid circular imports at module load time
    from app.database import SessionLocal
    from app.models.medication import Medication, MedicationLog
    from app.models.user import User
    from app.services.push import send_push_batch, is_expo_token

    now = datetime.now(APP_TZ)          # current time in the configured timezone (Pacific)
    current_time = now.strftime("%H:%M")
    today = now.date()

    db = SessionLocal()
    try:
        # All active medications whose reminder_times include right now
        all_meds = (
            db.query(Medication)
            .filter(Medication.is_active == True)
            .all()
        )

        due = [m for m in all_meds if current_time in (m.reminder_times or [])]
        if not due:
            return

        # Build set of already-logged (med_id, time) pairs for today
        logged_keys = {
            (log.medication_id, log.reminder_time)
            for log in db.query(MedicationLog)
            .filter(
                MedicationLog.log_date == today,
                MedicationLog.medication_id.in_([m.id for m in due]),
            )
            .all()
        }

        # Collect push messages (batched for efficiency)
        messages = []
        for med in due:
            if (med.id, current_time) in logged_keys:
                continue  # already taken/skipped

            user = db.query(User).filter(User.id == med.user_id).first()
            if not user or not user.push_token:
                continue
            if not is_expo_token(user.push_token):
                continue

            food_hint = {
                "before": "Take before food",
                "after":  "Take after food",
                "with":   "Take with food",
            }.get(med.food_timing, "")

            body_parts = []
            if med.dosage:
                body_parts.append(med.dosage)
            if food_hint:
                body_parts.append(food_hint)

            messages.append({
                "to":    user.push_token,
                "title": f"💊 {med.name}",
                "body":  " · ".join(body_parts) if body_parts else "Time for your medication",
                "sound": "default",
                "data":  {
                    "type":          "medication_reminder",
                    "medication_id": med.id,
                    "reminder_time": current_time,
                },
            })

        if messages:
            logger.info("Sending %d medication reminder(s) at %s UTC", len(messages), current_time)
            send_push_batch(messages)

    except Exception as exc:
        logger.error("Medication reminder job failed: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(
            _check_med_reminders,
            trigger="cron",
            minute="*",        # every minute
            id="med_reminders",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Medication reminder scheduler started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Medication reminder scheduler stopped")
