import random
import secrets
from datetime import timedelta
from urllib.parse import urlencode, quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.family import FamilyMember
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, decode_access_token,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

AVATAR_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
    "#14b8a6", "#06b6d4", "#84cc16", "#f43f5e",
]

# ── Email / password ───────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email           = user_data.email,
        name            = user_data.name,
        hashed_password = get_password_hash(user_data.password),
        avatar_color    = random.choice(AVATAR_COLORS),
        auth_provider   = "local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer",
                 user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Inactive user account")
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer",
                 user=UserResponse.model_validate(user))


# ── Google OAuth 2.0 ──────────────────────────────────────────────────────────

GOOGLE_AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _make_state() -> str:
    """Short-lived signed JWT used as the OAuth state parameter (CSRF protection)."""
    return create_access_token(
        data={"iss": "ff-oauth-state"},
        expires_delta=timedelta(minutes=10),
    )


def _verify_state(state: str) -> bool:
    payload = decode_access_token(state)
    return payload is not None and payload.get("iss") == "ff-oauth-state"


def _frontend_error(message: str) -> RedirectResponse:
    """Redirect to the frontend callback page with an error message."""
    return RedirectResponse(
        f"{settings.APP_URL}/auth/callback?error={quote(message)}",
        status_code=302,
    )


@router.get("/google", summary="Redirect to Google OAuth consent screen")
def google_login():
    """
    Initiates the Google OAuth 2.0 flow.
    Browser is redirected to Google's consent screen.
    """
    if not settings.google_oauth_configured:
        return _frontend_error(
            "Google sign-in is not configured on this server. "
            "Please use email and password to log in."
        )

    state = _make_state()
    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "access_type":   "online",
        "prompt":        "select_account",   # always show account picker
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}", status_code=302)


@router.get("/google/callback", summary="Google OAuth callback")
def google_callback(
    code:  str | None  = None,
    state: str | None  = None,
    error: str | None  = None,
    db:    Session     = Depends(get_db),
):
    """
    Handles the redirect from Google after the user authenticates.

    Flow:
      1. Verify CSRF state
      2. Exchange code for Google access token
      3. Fetch user info from Google
      4. Find or create local user (link existing email accounts automatically)
      5. Issue a FamilyFit JWT
      6. Redirect to frontend /auth/callback?token=<jwt>&next=<path>
    """
    # ── User cancelled or Google returned an error ─────────────────────────────
    if error:
        return _frontend_error(f"Google sign-in was cancelled: {error}")

    if not code or not state:
        return _frontend_error("Invalid OAuth response — missing code or state.")

    # ── CSRF check ─────────────────────────────────────────────────────────────
    if not _verify_state(state):
        return _frontend_error("Invalid or expired OAuth state. Please try again.")

    # ── Exchange code → Google access token ────────────────────────────────────
    try:
        token_resp = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code":          code,
                "client_id":     settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
            timeout=10,
        )
        token_resp.raise_for_status()
        google_token = token_resp.json().get("access_token")
        if not google_token:
            raise ValueError("No access_token in Google response")
    except Exception as exc:
        return _frontend_error(f"Failed to exchange OAuth code: {exc}")

    # ── Fetch user info from Google ────────────────────────────────────────────
    try:
        info_resp = httpx.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_token}"},
            timeout=10,
        )
        info_resp.raise_for_status()
        info = info_resp.json()
    except Exception as exc:
        return _frontend_error(f"Failed to fetch Google profile: {exc}")

    google_id  = info.get("id")
    email      = info.get("email", "")
    name       = info.get("name") or email.split("@")[0]
    avatar_url = info.get("picture")

    if not google_id or not email:
        return _frontend_error("Google did not return an email address.")

    # ── Find or create user ────────────────────────────────────────────────────
    # Priority: match by google_id first, then by email (link existing account)
    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Existing email/password account → link it to Google
            user.google_id   = google_id
            user.avatar_url  = avatar_url or user.avatar_url
            db.commit()
        else:
            # Brand-new user via Google
            user = User(
                email           = email,
                name            = name,
                hashed_password = get_password_hash(secrets.token_hex(32)),
                google_id       = google_id,
                avatar_url      = avatar_url,
                avatar_color    = random.choice(AVATAR_COLORS),
                auth_provider   = "google",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # ── Issue FamilyFit JWT ────────────────────────────────────────────────────
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # ── Determine where to send the user ──────────────────────────────────────
    has_family = db.query(FamilyMember).filter(FamilyMember.user_id == user.id).first()
    next_path  = "/dashboard" if has_family else "/onboarding"

    return RedirectResponse(
        f"{settings.APP_URL}/auth/callback"
        f"?token={access_token}"
        f"&next={quote(next_path)}",
        status_code=302,
    )
