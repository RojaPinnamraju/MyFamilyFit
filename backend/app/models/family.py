from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class FamilyRole(str, enum.Enum):
    ADMIN  = "admin"
    MEMBER = "member"


class Family(Base):
    __tablename__ = "families"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    members     = relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")
    invitations = relationship("Invitation",   back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id         = Column(Integer, primary_key=True, index=True)
    family_id  = Column(Integer, ForeignKey("families.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"),    nullable=False)
    role       = Column(Enum(FamilyRole), default=FamilyRole.MEMBER)
    joined_at  = Column(DateTime(timezone=True), server_default=func.now())

    family     = relationship("Family",     back_populates="members")
    user       = relationship("User",       back_populates="family_memberships")
