"""
/api/v1/invites — public-facing invite endpoints.

GET  /invites/{token}         Public preview; no auth required.
POST /invites/{token}/accept  Register + join family in one step; returns JWT.
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database              import get_db
from app.models.family         import Family, FamilyMember, FamilyRole
from app.models.invitation     import Invitation, InvitationStatus
from app.models.user           import User
from app.schemas.invitation    import InvitationPreview, InviteAcceptWithRegistration
from app.schemas.user          import Token, UserResponse
from app.core.security         import get_password_hash, create_access_token
from app.config                import settings

router = APIRouter(prefix="/invites", tags=["Invites"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _load_invitation(token: str, db: Session) -> Invitation:
    inv = (
        db.query(Invitation)
        .options(
            joinedload(Invitation.family),
            joinedload(Invitation.invited_by),
        )
        .filter(Invitation.token == token)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return inv


def _is_valid(inv: Invitation) -> bool:
    now = datetime.now(timezone.utc)
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return inv.status == InvitationStatus.PENDING and exp > now


# ── GET /invites/{token} — public preview ─────────────────────────────────────

@router.get("/{token}", response_model=InvitationPreview)
def get_invite_preview(token: str, db: Session = Depends(get_db)):
    """
    Returns family name, inviter, message, expiry, and validity status.
    No authentication required — used to render the join page before registration.
    """
    inv = _load_invitation(token, db)
    return InvitationPreview(
        family_name = inv.family.name,
        invited_by  = inv.invited_by.name,
        message     = inv.message,
        expires_at  = inv.expires_at,
        valid       = _is_valid(inv),
        email       = inv.email,          # pre-fill email on the registration form
    )


# ── POST /invites/{token}/accept — register + join in one step ─────────────────

@router.post("/{token}/accept", response_model=Token, status_code=status.HTTP_201_CREATED)
def accept_invite_with_registration(
    token: str,
    data:  InviteAcceptWithRegistration,
    db:    Session = Depends(get_db),
):
    """
    Creates a new user account and immediately joins the family referenced by
    the invite token. Returns a JWT so the user is logged in right away.

    Errors (400/403):
    - Invitation not found / expired / revoked
    - Email already registered
    - Email mismatch when invite is scoped to a specific address
    """
    inv = _load_invitation(token, db)

    # ── Validate invitation ────────────────────────────────────────────────────
    if inv.status == InvitationStatus.REVOKED:
        raise HTTPException(status_code=400, detail="This invitation has been revoked")

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="This invitation has already been used")

    now = datetime.now(timezone.utc)
    exp = inv.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp <= now:
        inv.status = InvitationStatus.REVOKED
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation has expired")

    # ── Email enforcement ──────────────────────────────────────────────────────
    if inv.email and inv.email.lower() != data.email.lower():
        raise HTTPException(
            status_code=403,
            detail=(
                f"This invitation was sent to {inv.email}. "
                "Please use that email address to register."
            ),
        )

    # ── Check for duplicate email ──────────────────────────────────────────────
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=400,
            detail=(
                "An account with this email already exists. "
                "Please log in and accept the invitation from your account."
            ),
        )

    # ── Create user ────────────────────────────────────────────────────────────
    import random
    AVATAR_COLORS = [
        "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
        "#14b8a6", "#06b6d4", "#84cc16", "#f43f5e",
    ]
    new_user = User(
        email             = data.email,
        name              = data.name,
        hashed_password   = get_password_hash(data.password),
        age               = data.age,
        height_cm         = data.height_cm,
        current_weight_kg = data.current_weight_kg,
        target_weight_kg  = data.target_weight_kg,
        goal_type         = data.goal_type,
        avatar_color      = random.choice(AVATAR_COLORS),
    )
    db.add(new_user)
    db.flush()   # get new_user.id without committing yet

    # ── Join family ────────────────────────────────────────────────────────────
    db.add(FamilyMember(
        family_id = inv.family_id,
        user_id   = new_user.id,
        role      = FamilyRole.MEMBER,
    ))

    # ── Mark invitation accepted ───────────────────────────────────────────────
    inv.status      = InvitationStatus.ACCEPTED
    inv.accepted_at = now

    db.commit()
    db.refresh(new_user)

    # ── Issue JWT ──────────────────────────────────────────────────────────────
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token = access_token,
        token_type   = "bearer",
        user         = UserResponse.model_validate(new_user),
    )
