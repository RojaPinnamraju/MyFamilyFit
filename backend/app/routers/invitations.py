from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database   import get_db
from app.models.family     import Family, FamilyMember, FamilyRole
from app.models.invitation import Invitation, InvitationStatus
from app.models.user       import User
from app.schemas.invitation import InvitationPreview, InvitationResponse
from app.core.deps          import get_current_user
from app.config             import settings

router = APIRouter(prefix="/invitations", tags=["Invitations"])


def _load_valid(token: str, db: Session) -> Invitation:
    inv = db.query(Invitation).options(
        joinedload(Invitation.family),
        joinedload(Invitation.invited_by),
    ).filter(Invitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return inv


# ── Public: preview (no auth) ─────────────────────────────────────────────────

@router.get("/{token}/preview", response_model=InvitationPreview)
def preview_invitation(token: str, db: Session = Depends(get_db)):
    inv = _load_valid(token, db)
    now = datetime.now(timezone.utc)
    valid = (
        inv.status == InvitationStatus.PENDING
        and inv.expires_at.replace(tzinfo=timezone.utc) > now
    )
    return InvitationPreview(
        family_name = inv.family.name,
        invited_by  = inv.invited_by.name,
        message     = inv.message,
        expires_at  = inv.expires_at,
        valid       = valid,
    )


# ── Authenticated: accept invitation ──────────────────────────────────────────

@router.post("/{token}/accept", status_code=status.HTTP_200_OK)
def accept_invitation(
    token: str,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = _load_valid(token, db)
    now = datetime.now(timezone.utc)

    if inv.status != InvitationStatus.PENDING:
        raise HTTPException(status_code=400,
                            detail=f"Invitation is {inv.status.value}")

    if inv.expires_at.replace(tzinfo=timezone.utc) <= now:
        inv.status = InvitationStatus.REVOKED
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # If the invite was scoped to an email, enforce it
    if inv.email and inv.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=403,
            detail="This invitation was sent to a different email address",
        )

    # Already a member?
    if db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="You are already in a family")

    # Already a member of this specific family?
    existing = db.query(FamilyMember).filter(
        FamilyMember.family_id == inv.family_id,
        FamilyMember.user_id   == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already a member of this family")

    db.add(FamilyMember(
        family_id = inv.family_id,
        user_id   = current_user.id,
        role      = FamilyRole.MEMBER,
    ))
    inv.status      = InvitationStatus.ACCEPTED
    inv.accepted_at = now
    db.commit()

    return {
        "message":     f"Successfully joined {inv.family.name}",
        "family_id":   inv.family_id,
        "family_name": inv.family.name,
    }
