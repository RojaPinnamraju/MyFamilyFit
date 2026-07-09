from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.invitation import InvitationStatus
from app.models.user import GoalType


class InvitationCreate(BaseModel):
    email:   Optional[EmailStr] = None   # None = link-only invite anyone can use
    message: Optional[str]      = None


class InvitationResponse(BaseModel):
    id:          int
    family_id:   int
    family_name: str
    invited_by:  str
    email:       Optional[str]
    token:       str
    status:      InvitationStatus
    message:     Optional[str]
    invite_url:  str
    expires_at:  datetime
    created_at:  datetime
    email_sent:  bool = False

    class Config:
        from_attributes = True


class InvitationPreview(BaseModel):
    """Public view shown to anyone before they register/login."""
    family_name: str
    invited_by:  str
    message:     Optional[str]
    expires_at:  datetime
    valid:       bool
    email:       Optional[str] = None   # pre-fill email field on registration form


class InviteAcceptWithRegistration(BaseModel):
    """Data the invited user submits to register + join the family in one step."""
    name:               str
    email:              EmailStr
    password:           str
    age:                Optional[int]   = None
    height_cm:          Optional[float] = None
    current_weight_kg:  Optional[float] = None
    target_weight_kg:   Optional[float] = None
    goal_type:          Optional[GoalType] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class MemberRoleUpdate(BaseModel):
    role: str   # "admin" | "member"
