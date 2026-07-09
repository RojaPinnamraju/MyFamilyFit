"""
Seed script — Jampana Family development data.

Run standalone:  python -m app.seed
Called by:       entrypoint.sh on every container start (idempotent)

Edit the MEMBERS list below to change names / emails before first boot.
All passwords default to:  FamilyFit2024!
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta, date
import random

from app.database import SessionLocal, engine, Base
from app.models.user import User, GoalType, Gender
from app.models.family import Family, FamilyMember, FamilyRole
from app.models.weight import WeightEntry
from app.models.workout import WorkoutEntry, Exercise, ExerciseCategory
from app.models.meal import MealEntry, MealItem, MealType
from app.models.water import WaterEntry
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)

# ── Edit these to personalise ──────────────────────────────────────────────────
FAMILY_NAME  = "Jampana Family"
INVITE_CODE  = "JAMPANA1"
DEFAULT_PASS = "FamilyFit2024!"

MEMBERS = [
    # ── Roja ──────────────────────────────────────────────────────────────────
    dict(
        first_name="Roja",
        last_name="Jampana",
        email="roja@jampana.local",          # ← edit before going live
        age=32,
        gender=Gender.FEMALE,
        height_cm=160.0,
        current_weight_kg=65.0,
        target_weight_kg=58.0,
        goal_type=GoalType.LOSE_WEIGHT,
        daily_calorie_goal=1750,
        daily_water_goal_ml=2500,
        avatar_color="#ec4899",
        role=FamilyRole.ADMIN,
    ),
    # ── Husband ───────────────────────────────────────────────────────────────
    dict(
        first_name="Arun",
        last_name="Jampana",
        email="arun@jampana.local",
        age=34,
        gender=Gender.MALE,
        height_cm=175.0,
        current_weight_kg=78.0,
        target_weight_kg=82.0,
        goal_type=GoalType.GAIN_MUSCLE,
        daily_calorie_goal=3000,
        daily_water_goal_ml=3500,
        avatar_color="#6366f1",
        role=FamilyRole.MEMBER,
    ),
    # ── Father ────────────────────────────────────────────────────────────────
    dict(
        first_name="Venkat",
        last_name="Jampana",
        email="venkat@jampana.local",
        age=62,
        gender=Gender.MALE,
        height_cm=168.0,
        current_weight_kg=82.0,
        target_weight_kg=75.0,
        goal_type=GoalType.LOSE_WEIGHT,
        daily_calorie_goal=1900,
        daily_water_goal_ml=2000,
        avatar_color="#3b82f6",
        role=FamilyRole.MEMBER,
    ),
    # ── Mother ────────────────────────────────────────────────────────────────
    dict(
        first_name="Padma",
        last_name="Jampana",
        email="padma@jampana.local",
        age=59,
        gender=Gender.FEMALE,
        height_cm=155.0,
        current_weight_kg=68.0,
        target_weight_kg=63.0,
        goal_type=GoalType.LOSE_WEIGHT,
        daily_calorie_goal=1600,
        daily_water_goal_ml=2000,
        avatar_color="#10b981",
        role=FamilyRole.MEMBER,
    ),
    # ── Father-in-law ─────────────────────────────────────────────────────────
    dict(
        first_name="Suresh",
        last_name="Reddy",
        email="suresh@jampana.local",
        age=65,
        gender=Gender.MALE,
        height_cm=170.0,
        current_weight_kg=85.0,
        target_weight_kg=78.0,
        goal_type=GoalType.LOSE_WEIGHT,
        daily_calorie_goal=1800,
        daily_water_goal_ml=2000,
        avatar_color="#f59e0b",
        role=FamilyRole.MEMBER,
    ),
    # ── Mother-in-law ─────────────────────────────────────────────────────────
    dict(
        first_name="Lakshmi",
        last_name="Reddy",
        email="lakshmi@jampana.local",
        age=61,
        gender=Gender.FEMALE,
        height_cm=153.0,
        current_weight_kg=70.0,
        target_weight_kg=65.0,
        goal_type=GoalType.LOSE_WEIGHT,
        daily_calorie_goal=1600,
        daily_water_goal_ml=2000,
        avatar_color="#8b5cf6",
        role=FamilyRole.MEMBER,
    ),
]
# ── End of editable section ───────────────────────────────────────────────────


# ---------------------------------------------------------------------------
# Realistic workout templates
# ---------------------------------------------------------------------------
WORKOUTS = [
    dict(name="Morning Walk", duration_minutes=40, exercises=[
        dict(name="Brisk Walking", category=ExerciseCategory.CARDIO, duration_seconds=2400),
    ]),
    dict(name="Upper Body", duration_minutes=50, exercises=[
        dict(name="Bench Press",    category=ExerciseCategory.STRENGTH, sets=4, reps=10, weight_kg=50.0),
        dict(name="Dumbbell Rows",  category=ExerciseCategory.STRENGTH, sets=3, reps=12, weight_kg=20.0),
        dict(name="Shoulder Press", category=ExerciseCategory.STRENGTH, sets=3, reps=12, weight_kg=24.0),
        dict(name="Bicep Curls",    category=ExerciseCategory.STRENGTH, sets=3, reps=15, weight_kg=12.0),
    ]),
    dict(name="Yoga & Stretching", duration_minutes=45, exercises=[
        dict(name="Sun Salutation",   category=ExerciseCategory.FLEXIBILITY, duration_seconds=900),
        dict(name="Warrior Sequence", category=ExerciseCategory.FLEXIBILITY, duration_seconds=1200),
        dict(name="Cool-down Stretch",category=ExerciseCategory.FLEXIBILITY, duration_seconds=600),
    ]),
    dict(name="Leg Day", duration_minutes=55, exercises=[
        dict(name="Squats",      category=ExerciseCategory.STRENGTH, sets=4, reps=12, weight_kg=60.0),
        dict(name="Lunges",      category=ExerciseCategory.STRENGTH, sets=3, reps=10),
        dict(name="Leg Press",   category=ExerciseCategory.STRENGTH, sets=3, reps=15, weight_kg=80.0),
        dict(name="Calf Raises", category=ExerciseCategory.STRENGTH, sets=4, reps=20, weight_kg=30.0),
    ]),
    dict(name="HIIT Cardio", duration_minutes=30, exercises=[
        dict(name="Burpees",    category=ExerciseCategory.CARDIO, sets=4, reps=15),
        dict(name="Jump Rope",  category=ExerciseCategory.CARDIO, duration_seconds=300),
        dict(name="High Knees", category=ExerciseCategory.CARDIO, duration_seconds=180),
    ]),
    dict(name="Evening Jog", duration_minutes=35, exercises=[
        dict(name="Jogging", category=ExerciseCategory.CARDIO, duration_seconds=2100),
    ]),
    dict(name="Core & Abs", duration_minutes=30, exercises=[
        dict(name="Plank",         category=ExerciseCategory.STRENGTH, sets=3, duration_seconds=60),
        dict(name="Crunches",      category=ExerciseCategory.STRENGTH, sets=3, reps=20),
        dict(name="Leg Raises",    category=ExerciseCategory.STRENGTH, sets=3, reps=15),
        dict(name="Russian Twist", category=ExerciseCategory.STRENGTH, sets=3, reps=20),
    ]),
]

# ---------------------------------------------------------------------------
# Realistic Indian-household meal templates
# ---------------------------------------------------------------------------
MEAL_TEMPLATES = {
    MealType.BREAKFAST: [
        [
            dict(name="Oatmeal with Almonds", quantity="1 bowl", calories=320, protein_g=11, carbs_g=52, fat_g=8),
            dict(name="Banana",               quantity="1 medium", calories=105, protein_g=1,  carbs_g=27, fat_g=0),
            dict(name="Chai (low sugar)",      quantity="1 cup",   calories=60,  protein_g=2,  carbs_g=8,  fat_g=2),
        ],
        [
            dict(name="Idli",                 quantity="3 pieces", calories=201, protein_g=6,  carbs_g=41, fat_g=1),
            dict(name="Sambar",               quantity="1 cup",    calories=90,  protein_g=5,  carbs_g=15, fat_g=2),
            dict(name="Coconut Chutney",      quantity="2 tbsp",   calories=60,  protein_g=1,  carbs_g=4,  fat_g=5),
        ],
        [
            dict(name="Whole Wheat Upma",     quantity="1 cup",    calories=250, protein_g=7,  carbs_g=42, fat_g=6),
            dict(name="Boiled Egg",           quantity="2 eggs",   calories=156, protein_g=13, carbs_g=1,  fat_g=11),
            dict(name="Orange Juice",         quantity="200ml",    calories=88,  protein_g=1,  carbs_g=21, fat_g=0),
        ],
        [
            dict(name="Greek Yogurt Parfait", quantity="1 bowl",   calories=280, protein_g=18, carbs_g=32, fat_g=7),
            dict(name="Whole Grain Toast",    quantity="2 slices", calories=160, protein_g=6,  carbs_g=30, fat_g=2),
        ],
    ],
    MealType.LUNCH: [
        [
            dict(name="Brown Rice",           quantity="1 cup",    calories=216, protein_g=5,  carbs_g=45, fat_g=2),
            dict(name="Dal Tadka",            quantity="1 cup",    calories=180, protein_g=12, carbs_g=28, fat_g=4),
            dict(name="Palak Paneer",         quantity="1 cup",    calories=260, protein_g=14, carbs_g=12, fat_g=18),
            dict(name="Cucumber Raita",       quantity="½ cup",    calories=60,  protein_g=3,  carbs_g=6,  fat_g=2),
        ],
        [
            dict(name="Grilled Chicken",      quantity="150g",     calories=248, protein_g=46, carbs_g=0,  fat_g=6),
            dict(name="Jeera Rice",           quantity="1 cup",    calories=220, protein_g=4,  carbs_g=46, fat_g=3),
            dict(name="Mixed Vegetable Sabzi",quantity="1 cup",    calories=120, protein_g=4,  carbs_g=18, fat_g=4),
        ],
        [
            dict(name="Roti",                 quantity="3 pieces", calories=270, protein_g=8,  carbs_g=54, fat_g=3),
            dict(name="Chana Masala",         quantity="1 cup",    calories=210, protein_g=12, carbs_g=35, fat_g=4),
            dict(name="Onion Salad",          quantity="½ cup",    calories=30,  protein_g=1,  carbs_g=7,  fat_g=0),
        ],
        [
            dict(name="Quinoa Bowl",          quantity="1 bowl",   calories=350, protein_g=14, carbs_g=52, fat_g=8),
            dict(name="Grilled Paneer",       quantity="100g",     calories=265, protein_g=18, carbs_g=3,  fat_g=20),
        ],
    ],
    MealType.DINNER: [
        [
            dict(name="Whole Wheat Roti",     quantity="2 pieces", calories=180, protein_g=6,  carbs_g=36, fat_g=2),
            dict(name="Moong Dal",            quantity="1 cup",    calories=150, protein_g=10, carbs_g=24, fat_g=1),
            dict(name="Aloo Gobi",            quantity="1 cup",    calories=140, protein_g=4,  carbs_g=22, fat_g=5),
            dict(name="Curd",                 quantity="½ cup",    calories=60,  protein_g=3,  carbs_g=5,  fat_g=3),
        ],
        [
            dict(name="Baked Salmon",         quantity="180g",     calories=370, protein_g=37, carbs_g=0,  fat_g=24),
            dict(name="Steamed Vegetables",   quantity="1 cup",    calories=80,  protein_g=4,  carbs_g=14, fat_g=1),
            dict(name="Multigrain Bread",     quantity="2 slices", calories=160, protein_g=6,  carbs_g=28, fat_g=3),
        ],
        [
            dict(name="Chicken Curry",        quantity="1 cup",    calories=290, protein_g=28, carbs_g=10, fat_g=16),
            dict(name="Steamed Rice",         quantity="¾ cup",    calories=162, protein_g=3,  carbs_g=36, fat_g=0),
            dict(name="Tomato Onion Salad",   quantity="1 cup",    calories=40,  protein_g=2,  carbs_g=9,  fat_g=0),
        ],
    ],
    MealType.SNACK: [
        [dict(name="Mixed Nuts",              quantity="30g",      calories=185, protein_g=5,  carbs_g=6,  fat_g=17)],
        [dict(name="Fruit Bowl",              quantity="1 bowl",   calories=140, protein_g=2,  carbs_g=36, fat_g=0)],
        [dict(name="Protein Shake",           quantity="1 scoop",  calories=120, protein_g=24, carbs_g=5,  fat_g=1)],
        [dict(name="Roasted Chana",           quantity="50g",      calories=180, protein_g=10, carbs_g=28, fat_g=3)],
        [
            dict(name="Greek Yogurt",         quantity="150g",     calories=100, protein_g=17, carbs_g=6,  fat_g=0),
            dict(name="Honey",                quantity="1 tsp",    calories=21,  protein_g=0,  carbs_g=6,  fat_g=0),
        ],
        [dict(name="Green Tea & Biscuits",    quantity="2 biscuits",calories=90, protein_g=2,  carbs_g=14, fat_g=3)],
    ],
}

WATER_AMOUNTS = [150, 200, 250, 300, 350, 500]

MEAL_HOURS = {
    MealType.BREAKFAST: (7, 9),
    MealType.LUNCH:     (12, 14),
    MealType.DINNER:    (19, 21),
    MealType.SNACK:     (10, 17),
}


def _rand_hour(meal_type: MealType) -> int:
    lo, hi = MEAL_HOURS[meal_type]
    return random.randint(lo, hi)


def _weight_trend(base: float, goal: GoalType, day_offset: int) -> float:
    """Return a realistic weight for a given day offset (0 = oldest)."""
    days_total = 30
    progress = day_offset / days_total
    if goal == GoalType.LOSE_WEIGHT:
        trend = -0.08 * progress * 30          # ~-2.4 kg over 30 days
    elif goal == GoalType.GAIN_MUSCLE:
        trend = 0.04 * progress * 30           # ~+1.2 kg over 30 days
    else:
        trend = 0.0
    noise = random.uniform(-0.25, 0.25)
    return round(max(base + trend + noise, 35.0), 1)


def seed():
    db = SessionLocal()
    try:
        # ── Idempotency guard ──────────────────────────────────────────────
        if db.query(User).filter(User.email == MEMBERS[0]["email"]).first():
            print("Seed data already present — skipping.")
            return

        print(f"Seeding '{FAMILY_NAME}'...")
        hashed_pw = get_password_hash(DEFAULT_PASS)

        # ── Create users ───────────────────────────────────────────────────
        users: list[User] = []
        for m in MEMBERS:
            full_name = f"{m['first_name']} {m['last_name']}"
            user = User(
                email=m["email"],
                name=full_name,
                hashed_password=hashed_pw,
                age=m["age"],
                gender=m["gender"],
                height_cm=m["height_cm"],
                current_weight_kg=m["current_weight_kg"],
                target_weight_kg=m["target_weight_kg"],
                goal_type=m["goal_type"],
                daily_calorie_goal=m["daily_calorie_goal"],
                daily_water_goal_ml=m["daily_water_goal_ml"],
                avatar_color=m["avatar_color"],
            )
            db.add(user)
            users.append(user)

        db.flush()

        # ── Create family ──────────────────────────────────────────────────
        family = Family(name=FAMILY_NAME, invite_code=INVITE_CODE)
        db.add(family)
        db.flush()

        for user, m in zip(users, MEMBERS):
            db.add(FamilyMember(
                family_id=family.id,
                user_id=user.id,
                role=m["role"],
            ))

        db.flush()

        # ── Generate 30 days of realistic history for each user ────────────
        today = date.today()

        for user, m in zip(users, MEMBERS):
            base_w = m["current_weight_kg"]

            for day_offset in range(30, -1, -1):   # 30 days ago → today
                day = today - timedelta(days=day_offset)
                day_dt = datetime.combine(day, datetime.min.time())

                # Weight (every 2–3 days, slightly randomised)
                if day_offset % random.randint(2, 3) == 0 or day_offset == 0:
                    w = _weight_trend(base_w, m["goal_type"], 30 - day_offset)
                    db.add(WeightEntry(
                        user_id=user.id,
                        weight_kg=w,
                        logged_at=day_dt.replace(hour=7, minute=random.randint(0, 30)),
                    ))
                    # Keep user's current_weight_kg in sync with most recent
                    if day_offset == 0:
                        user.current_weight_kg = w

                # Workout (≈5 days/week)
                if random.random() < 0.70:
                    # Pick a workout appropriate to age/goal
                    pool = WORKOUTS
                    if m["age"] >= 58:
                        pool = [w for w in WORKOUTS if w["name"] in (
                            "Morning Walk", "Yoga & Stretching", "Evening Jog", "Core & Abs"
                        )]
                    wt = random.choice(pool)
                    workout = WorkoutEntry(
                        user_id=user.id,
                        name=wt["name"],
                        duration_minutes=wt["duration_minutes"],
                        logged_at=day_dt.replace(hour=random.randint(6, 20),
                                                  minute=random.randint(0, 59)),
                    )
                    db.add(workout)
                    db.flush()
                    for ex in wt["exercises"]:
                        db.add(Exercise(
                            workout_id=workout.id,
                            name=ex["name"],
                            category=ex["category"],
                            sets=ex.get("sets"),
                            reps=ex.get("reps"),
                            weight_kg=ex.get("weight_kg"),
                            duration_seconds=ex.get("duration_seconds"),
                        ))

                # Meals (breakfast + lunch + dinner every day; snack ~60 %)
                for meal_type in [MealType.BREAKFAST, MealType.LUNCH,
                                   MealType.DINNER, MealType.SNACK]:
                    if meal_type == MealType.SNACK and random.random() < 0.40:
                        continue
                    templates = MEAL_TEMPLATES[meal_type]
                    items_data = random.choice(templates)
                    meal = MealEntry(
                        user_id=user.id,
                        meal_type=meal_type,
                        logged_at=day_dt.replace(
                            hour=_rand_hour(meal_type),
                            minute=random.randint(0, 59),
                        ),
                    )
                    db.add(meal)
                    db.flush()
                    for item_d in items_data:
                        db.add(MealItem(
                            meal_id=meal.id,
                            name=item_d["name"],
                            quantity=item_d.get("quantity"),
                            calories=item_d["calories"],
                            protein_g=item_d["protein_g"],
                            carbs_g=item_d["carbs_g"],
                            fat_g=item_d["fat_g"],
                        ))

                # Water (6–10 glasses spread across the day)
                num_glasses = random.randint(6, 10)
                for _ in range(num_glasses):
                    db.add(WaterEntry(
                        user_id=user.id,
                        amount_ml=random.choice(WATER_AMOUNTS),
                        logged_at=day_dt.replace(
                            hour=random.randint(7, 21),
                            minute=random.randint(0, 59),
                        ),
                    ))

        db.commit()
        print(f"  ✓  {len(users)} users created in '{FAMILY_NAME}'")
        print(f"  ✓  Invite code: {INVITE_CODE}")
        print(f"  ✓  Password for all accounts: {DEFAULT_PASS}")
        print()
        print("  Accounts:")
        for m in MEMBERS:
            role_tag = " [admin]" if m["role"] == FamilyRole.ADMIN else ""
            print(f"    {m['email']}{role_tag}")

    except Exception as exc:
        db.rollback()
        print(f"Seed error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
