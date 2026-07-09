# FamilyFit

**Track Together, Thrive Together** — A full-stack family fitness and meal tracking web application.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Charts | Recharts |
| Backend | FastAPI + SQLAlchemy + Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT (via python-jose) |
| Email | SMTP (smtplib) via BackgroundTasks |
| Containers | Docker + Docker Compose |

---

## Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone & configure
```bash
git clone <repo-url>
cd MyFamilyFit
cp .env.example .env
# Optional: add SMTP credentials to .env to enable real email delivery
```

### 2. Start all services
```bash
docker compose up --build
```

This starts PostgreSQL → backend (schema auto-created) → React frontend.

### 3. Open the app
**http://localhost:5173**

Register → complete onboarding → create or join a family.

---

## Invite Flow (end-to-end)

**Roja wants to invite her dad:**

1. Roja opens **Family → Invite** and enters `dad@gmail.com`
2. Clicks **Send Invite**
3. Dad receives an email:
   - Subject: *"Roja Jampana invited you to join Jampana Family on FamilyFit"*
   - A styled HTML email with a **Join Jampana Family →** button
   - Shows invite expiry date (7 days)
4. Dad clicks the button → lands on `/join?token=<uuid>`
5. Page shows:
   - Family name + who invited him
   - Registration form: Name, Email (pre-filled), Password, Age, Height, Weight, Goal
6. Dad fills the form and clicks **Join Jampana Family →**
7. Account is created and he is automatically added to the family
8. He's logged in and redirected to the dashboard

**If SMTP is not configured:** after step 2, the invite link appears inside the UI so Roja can copy and send it manually (via WhatsApp, iMessage, etc.).

---

## SMTP Email Setup (optional)

Without SMTP, invite links are displayed in the UI. To enable real email delivery, add these to your `.env`:

```env
APP_URL=http://localhost:5173   # change to your domain in production

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   # Gmail App Password (requires 2FA)
SMTP_FROM=you@gmail.com
SMTP_TLS=true
```

**Gmail setup:** enable 2FA → create an [App Password](https://myaccount.google.com/apppasswords) → use it as `SMTP_PASSWORD`.

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxx
SMTP_FROM=noreply@yourdomain.com
```

Emails are sent asynchronously via FastAPI `BackgroundTasks` so the API response is instant regardless of mail delivery speed.

---

## Project Structure

```
MyFamilyFit/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, router registration
│   │   ├── config.py           # Settings + SMTP config
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── family.py
│   │   │   ├── invitation.py   # UUID token, status, expiry
│   │   │   ├── weight.py
│   │   │   ├── workout.py
│   │   │   ├── meal.py
│   │   │   └── water.py
│   │   ├── schemas/
│   │   │   ├── invitation.py   # InviteAcceptWithRegistration schema
│   │   │   └── user.py
│   │   ├── services/
│   │   │   └── email.py        # HTML email builder + SMTP sender
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── families.py     # Admin invite + member management
│   │       ├── invitations.py  # Legacy /invitations/* paths
│   │       ├── invites.py      # New /invites/* — preview + register-and-join
│   │       ├── weights.py
│   │       ├── workouts.py
│   │       ├── meals.py
│   │       └── water.py
│   ├── alembic/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── families.ts     # All invite API methods
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Onboarding.tsx  # Post-registration: create or join
│   │   │   ├── JoinFamily.tsx  # /join?token=... with registration form
│   │   │   ├── Family.tsx      # Admin: invite modal, member mgmt
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── WeightTracking.tsx
│   │   │   ├── WorkoutTracking.tsx
│   │   │   ├── MealTracking.tsx
│   │   │   └── WaterTracking.tsx
│   │   ├── store/
│   │   ├── types/
│   │   └── App.tsx
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API Reference

Base URL: `http://localhost:8000/api/v1`  
Interactive docs: **http://localhost:8000/docs**

### Authentication
```
POST /auth/register              Register new user
POST /auth/login                 Login, receive JWT
```

### Users
```
GET    /users/me                 Get current user profile
PATCH  /users/me                 Update profile
GET    /users/me/dashboard       Dashboard stats
```

### Families
```
POST   /families/                        Create family (caller becomes admin)
POST   /families/join                    Join by 8-char invite code
GET    /families/me                      My family + members
DELETE /families/me/leave                Leave family
GET    /families/me/activity             Recent family activity feed
DELETE /families/me/members/{user_id}    [Admin] Remove a member
PATCH  /families/me/members/{user_id}/role  [Admin] Promote/demote
POST   /families/me/invitations          [Admin] Create invite (via /me shorthand)
GET    /families/me/invitations          [Admin] List pending invites
DELETE /families/me/invitations/{id}     [Admin] Revoke invite
POST   /families/{family_id}/invite      [Admin] Create invite by family ID
```

### Invites (primary invite flow — register + join)
```
GET    /invites/{token}          Public preview — family name, inviter, expiry, validity
POST   /invites/{token}/accept   Register account + join family in one step; returns JWT
```

### Weight
```
GET    /weights/       List entries
POST   /weights/       Add entry
PATCH  /weights/{id}   Update entry
DELETE /weights/{id}   Delete entry
```

### Workouts
```
GET    /workouts/       List workouts
POST   /workouts/       Create workout + exercises
GET    /workouts/{id}   Single workout
PATCH  /workouts/{id}   Update workout
DELETE /workouts/{id}   Delete workout
```

### Meals
```
GET    /meals/          List meals  (?date_filter=YYYY-MM-DD)
POST   /meals/          Add meal + food items
DELETE /meals/{id}      Delete meal
```

### Water
```
GET    /water/today     Today's total + entries
POST   /water/          Log intake
DELETE /water/{id}      Delete entry
```

---

## Admin Permissions

Family admins can:
- Invite members via email (real email delivery if SMTP configured)
- Generate shareable invite links (shown in UI if no SMTP)
- Remove members from the family
- Promote members to admin or demote admins to member
- Revoke pending invitations

Regular members can:
- View all family members and their goals
- Leave the family

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://user:pass@localhost:5432/familyfit"
export SECRET_KEY="your-secret-key"
# Optional SMTP:
export SMTP_HOST="smtp.gmail.com"
export SMTP_USERNAME="you@gmail.com"
export SMTP_PASSWORD="your-app-password"
export SMTP_FROM="you@gmail.com"

uvicorn app.main:app --reload --port 8000
# Schema is created automatically on startup
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

---

## Dark Mode

Detected from OS preference; toggled via the moon/sun icon in the nav bar. Preference is saved to localStorage.

---

## License

MIT License.
