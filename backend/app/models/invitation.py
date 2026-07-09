from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class InvitationStatus(str, enum.Enum):
    PENDING  = "pending"
    ACCEPTED = "accepted"
    REVOKED  = "revoked"


class Invitation(Base):
    __tablename__ = "invitations"

    id             = Column(Integer, primary_key=True, index=True)
    family_id      = Column(Integer, ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    invited_by_id  = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)

    # Optional: if set, the invite is scoped to this email address
    email          = Column(String, nullable=True, index=True)
    token          = Column(String, unique=True, nullable=False, index=True)
    status         = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    message        = Column(Text, nullable=True)

    expires_at     = Column(DateTime(timezone=True), nullable=False)
    accepted_at    = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    family         = relationship("Family",  back_populates="invitations")
    invited_by     = relationship("User",    foreign_keys=[invited_by_id])
