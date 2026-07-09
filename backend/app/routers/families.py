import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.family     import Family, FamilyMember, FamilyRole
from app.models.invitation import Invitation, InvitationStatus
from app.models.user       import User
from app.schemas.family     import FamilyCreate, FamilyJoin, FamilyResponse
from app.schemas.invitation import InvitationCreate, InvitationResponse, MemberRoleUpdate
from app.core.deps         import get_current_user
from app.config            import settings
from app.services.email    import email_service

router = APIRouter(prefix="/families", tags=["Families"])

INVITE_TOKEN_EXPIRY_DAYS = 7


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_invite_code(db: Session) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not db.query(Family).filter(Family.invite_code == code).first():
            return code


def _family_with_members(db: Session, family_id: int) -> Family:
    return db.query(Family).options(
        joinedload(Family.members).joinedload(FamilyMember.user)
    ).filter(Family.id == family_id).first()


def _require_admin(db: Session, family_id: int, user: User) -> FamilyMember:
    membership = db.query(FamilyMember).filter(
        FamilyMember.family_id == family_id,
        FamilyMember.user_id   == user.id,
    ).first()
    if not membership or membership.role != FamilyRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Only family admins can perform this action")
    return membership


def _invite_url(token: str) -> str:
    return f"{settings.APP_URL}/join?token={token}"


def _build_invitation_response(inv: Invitation, email_sent: bool = False) -> InvitationResponse:
    return InvitationResponse(
        id=inv.id,
        family_id=inv.family_id,
        family_name=inv.family.name,
        invited_by=inv.invited_by.name,
        email=inv.email,
        token=inv.token,
        status=inv.status,
        message=inv.message,
        invite_url=_invite_url(inv.token),
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        email_sent=email_sent,
    )


# ── Create family ─────────────────────────────────────────────────────────────

@router.post("/", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
def create_family(
    data: FamilyCreate,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You are already in a family. Leave first.")

    family = Family(name=data.name, invite_code=_gen_invite_code(db))
    db.add(family)
    db.flush()
    db.add(FamilyMember(family_id=family.id, user_id=current_user.id, role=FamilyRole.ADMIN))
    db.commit()
    return _family_with_members(db, family.id)


# ── Join by invite code (short-code path) ─────────────────────────────────────

@router.post("/join", response_model=FamilyResponse)
def join_by_code(
    data: FamilyJoin,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="You are already in a family.")

    family = db.query(Family).filter(
        Family.invite_code == data.invite_code.strip().upper()
    ).first()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Invalid invite code")

    db.add(FamilyMember(family_id=family.id, user_id=current_user.id, role=FamilyRole.MEMBER))
    db.commit()
    return _family_with_members(db, family.id)


# ── Get my family ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=FamilyResponse)
def get_my_family(
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="You are not in any family")
    return _family_with_members(db, membership.family_id)


# ── Leave family ──────────────────────────────────────────────────────────────

@router.delete("/me/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_family(
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in a family")

    # Prevent last admin from leaving
    if membership.role == FamilyRole.ADMIN:
        other_admins = db.query(FamilyMember).filter(
            FamilyMember.family_id == membership.family_id,
            FamilyMember.role      == FamilyRole.ADMIN,
            FamilyMember.user_id   != current_user.id,
        ).count()
        if other_admins == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are the only admin. Promote another member before leaving.",
            )
    db.delete(membership)
    db.commit()


# ── Admin: remove a member ────────────────────────────────────────────────────

@router.delete("/me/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: int,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not my_membership:
        raise HTTPException(status_code=404, detail="You are not in a family")
    _require_admin(db, my_membership.family_id, current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Use /leave to remove yourself")

    target = db.query(FamilyMember).filter(
        FamilyMember.family_id == my_membership.family_id,
        FamilyMember.user_id   == user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(target)
    db.commit()


# ── Admin: change member role ─────────────────────────────────────────────────

@router.patch("/me/members/{user_id}/role", response_model=dict)
def change_member_role(
    user_id: int,
    data: MemberRoleUpdate,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not my_membership:
        raise HTTPException(status_code=404, detail="You are not in a family")
    _require_admin(db, my_membership.family_id, current_user)

    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    target = db.query(FamilyMember).filter(
        FamilyMember.family_id == my_membership.family_id,
        FamilyMember.user_id   == user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    target.role = FamilyRole.ADMIN if data.role == "admin" else FamilyRole.MEMBER
    db.commit()
    return {"user_id": user_id, "role": data.role}


# ── Admin: create invitation ──────────────────────────────────────────────────

def _do_create_invitation(
    data: InvitationCreate,
    family: "Family",
    current_user: "User",
    db: Session,
    background_tasks: BackgroundTasks,
) -> tuple["Invitation", bool]:
    """Shared logic for creating an invitation used by both /me/invitations and /{family_id}/invite."""
    # If email supplied, check they're not already a member
    if data.email:
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            already = db.query(FamilyMember).filter(
                FamilyMember.family_id == family.id,
                FamilyMember.user_id   == existing_user.id,
            ).first()
            if already:
                raise HTTPException(status_code=400, detail="User is already a family member")

    token = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRY_DAYS)
    inv = Invitation(
        family_id     = family.id,
        invited_by_id = current_user.id,
        email         = data.email,
        token         = token,
        message       = data.message,
        expires_at    = expires,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Eager-load for response
    inv = db.query(Invitation).options(
        joinedload(Invitation.family),
        joinedload(Invitation.invited_by),
    ).filter(Invitation.id == inv.id).first()

    # Send email asynchronously via BackgroundTasks
    email_sent = False
    if data.email and email_service.is_configured():
        email_sent = True
        background_tasks.add_task(
            email_service.send_invitation,
            to_email    = data.email,
            family_name = family.name,
            invited_by  = current_user.name,
            invite_url  = _invite_url(token),
            expires_at  = expires,
            message     = data.message,
        )

    return inv, email_sent


@router.post("/me/invitations", response_model=InvitationResponse, status_code=201)
def create_invitation(
    data:             InvitationCreate,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User    = Depends(get_current_user),
):
    my_membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not my_membership:
        raise HTTPException(status_code=404, detail="You are not in a family")
    _require_admin(db, my_membership.family_id, current_user)
    family = db.query(Family).filter(Family.id == my_membership.family_id).first()
    inv, email_sent = _do_create_invitation(data, family, current_user, db, background_tasks)
    return _build_invitation_response(inv, email_sent=email_sent)


# ── Admin: list invitations ───────────────────────────────────────────────────

@router.get("/me/invitations", response_model=list[InvitationResponse])
def list_invitations(
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not my_membership:
        raise HTTPException(status_code=404, detail="You are not in a family")
    _require_admin(db, my_membership.family_id, current_user)

    invs = db.query(Invitation).options(
        joinedload(Invitation.family),
        joinedload(Invitation.invited_by),
    ).filter(
        Invitation.family_id == my_membership.family_id,
        Invitation.status    == InvitationStatus.PENDING,
    ).order_by(Invitation.created_at.desc()).all()

    return [_build_invitation_response(i) for i in invs]


# ── Admin: revoke invitation ──────────────────────────────────────────────────

@router.delete("/me/invitations/{invitation_id}", status_code=204)
def revoke_invitation(
    invitation_id: int,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not my_membership:
        raise HTTPException(status_code=404, detail="You are not in a family")
    _require_admin(db, my_membership.family_id, current_user)

    inv = db.query(Invitation).filter(
        Invitation.id        == invitation_id,
        Invitation.family_id == my_membership.family_id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    inv.status = InvitationStatus.REVOKED
    db.commit()


# ── Family activity feed ──────────────────────────────────────────────────────

@router.get("/me/activity")
def get_family_activity(
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.workout import WorkoutEntry
    from app.models.meal    import MealEntry
    from app.models.weight  import WeightEntry
    from datetime import timedelta

    membership = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
    if not membership:
        return []

    member_ids = [
        m.user_id for m in
        db.query(FamilyMember).filter(FamilyMember.family_id == membership.family_id).all()
    ]
    since = datetime.utcnow() - timedelta(days=7)
    activity = []

    for w in db.query(WorkoutEntry).filter(
        WorkoutEntry.user_id.in_(member_ids),
        WorkoutEntry.logged_at >= since,
    ).order_by(WorkoutEntry.logged_at.desc()).limit(20).all():
        u = db.query(User).filter(User.id == w.user_id).first()
        activity.append({
            "type": "workout", "user_name": u.name if u else "?",
            "user_color": u.avatar_color if u else "#6366f1",
            "description": f"logged a workout: {w.name}",
            "timestamp": w.logged_at.isoformat(),
        })

    for m in db.query(MealEntry).filter(
        MealEntry.user_id.in_(member_ids),
        MealEntry.logged_at >= since,
    ).order_by(MealEntry.logged_at.desc()).limit(20).all():
        u = db.query(User).filter(User.id == m.user_id).first()
        activity.append({
            "type": "meal", "user_name": u.name if u else "?",
            "user_color": u.avatar_color if u else "#6366f1",
            "description": f"logged {m.meal_type.value}: {m.total_calories} cal",
            "timestamp": m.logged_at.isoformat(),
        })

    for w in db.query(WeightEntry).filter(
        WeightEntry.user_id.in_(member_ids),
        WeightEntry.logged_at >= since,
    ).order_by(WeightEntry.logged_at.desc()).limit(10).all():
        u = db.query(User).filter(User.id == w.user_id).first()
        activity.append({
            "type": "weight", "user_name": u.name if u else "?",
            "user_color": u.avatar_color if u else "#6366f1",
            "description": f"logged weight: {w.weight_kg} kg",
            "timestamp": w.logged_at.isoformat(),
        })

    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:15]


# ── POST /families/{family_id}/invite — send invite by explicit family ID ──────

@router.post("/{family_id}/invite", response_model=InvitationResponse, status_code=201)
def send_family_invite(
    family_id:        int,
    data:             InvitationCreate,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User    = Depends(get_current_user),
):
    """
    Admin-only endpoint to create and (optionally) email an invitation for a
    specific family by ID.

    • If SMTP is configured and data.email is provided the email is sent
      asynchronously via BackgroundTasks so the response is instant.
    • If SMTP is not configured the invite_url is returned in the response
      so the admin can copy and share it manually.
    """
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    _require_admin(db, family_id, current_user)
    inv, email_sent = _do_create_invitation(data, family, current_user, db, background_tasks)
    return _build_invitation_response(inv, email_sent=email_sent)
