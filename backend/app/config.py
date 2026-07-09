from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://familyfit:familyfit@db:5432/familyfit"

    # JWT
    SECRET_KEY: str = "supersecretkey-change-in-production-please-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # App
    APP_NAME: str = "FamilyFit"
    APP_URL: str = "http://localhost:5173"   # Used for invite links
    DEBUG: bool = False

    # SMTP — leave blank to disable email; invite link will be shown in UI instead
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TLS: bool = True                   # Use STARTTLS (port 587). Set False for SSL (port 465).

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USERNAME and self.SMTP_PASSWORD and self.SMTP_FROM)


settings = Settings()
