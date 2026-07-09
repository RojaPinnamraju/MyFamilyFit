from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.family import FamilyRole
from app.schemas.user import UserResponse


class FamilyCreate(BaseModel):
    name: str


class FamilyJoin(BaseModel):
    invite_code: str


class FamilyMemberResponse(BaseModel):
    id: int
    role: FamilyRole
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


class FamilyResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    created_at: datetime
    members: List[FamilyMemberResponse] = []

    class Config:
        from_attributes = True
