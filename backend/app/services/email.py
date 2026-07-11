"""
Abstract email service with SMTP implementation.

If SMTP credentials are not configured the service is a no-op and the
caller falls back to displaying the invite link inside the UI.
"""
import smtplib
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


# ── Abstract base ─────────────────────────────────────────────────────────────

class BaseEmailService(ABC):
    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def send(self, *, to: str, subject: str, html: str, text: str) -> bool: ...

    def send_invitation(
        self,
        *,
        to_email:    str,
        family_name: str,
        invited_by:  str,
        invite_url:  str,
        expires_at:  datetime | None = None,
        message:     str | None = None,
    ) -> bool:
        subject = f"{invited_by} invited you to join {family_name} on MyFamilyFit"

        # Human-readable expiry
        if expires_at:
            exp_str = expires_at.strftime("%B %d, %Y")
        else:
            exp_str = "7 days from now"

        personal_html = (
            f"""
            <table role="presentation" cellpadding="0" cellspacing="0"
                   style="width:100%;background:#f0fdf4;border-radius:10px;margin:0 0 24px">
              <tr><td style="padding:14px 18px">
                <p style="color:#166534;font-size:14px;margin:0;font-style:italic">
                  "{message}"
                </p>
              </td></tr>
            </table>"""
            if message else ""
        )

        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f4f6">
    <tr><td style="padding:40px 20px">
      <table role="presentation" cellpadding="0" cellspacing="0"
             style="max-width:560px;margin:auto;background:#ffffff;
                    border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr><td style="background:#6366f1;padding:32px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;
                     letter-spacing:-0.5px">MyFamilyFit</h1>
          <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px">
            Track together, thrive together
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 36px 32px">
          <h2 style="color:#1f2937;font-size:22px;margin:0 0 20px;font-weight:700">
            You&rsquo;re invited! 🎉
          </h2>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 6px">
            <strong style="color:#1f2937">{invited_by}</strong> has invited you to join:
          </p>
          <p style="color:#6366f1;font-size:26px;font-weight:700;
                    margin:0 0 28px;letter-spacing:-0.5px">
            {family_name}
          </p>

          {personal_html}

          <!-- CTA button -->
          <table role="presentation" cellpadding="0" cellspacing="0"
                 style="margin:0 0 32px">
            <tr>
              <td style="background:#6366f1;border-radius:12px;
                         box-shadow:0 4px 12px rgba(99,102,241,0.4)">
                <a href="{invite_url}"
                   style="display:block;padding:16px 48px;color:#ffffff;
                          text-decoration:none;font-size:16px;font-weight:600;
                          text-align:center;letter-spacing:0.2px">
                  Join {family_name} &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Expiry notice -->
          <table role="presentation" cellpadding="0" cellspacing="0"
                 style="width:100%;background:#fef9c3;border-radius:10px;
                        border:1px solid #fde047;margin-bottom:24px">
            <tr><td style="padding:12px 18px">
              <p style="color:#713f12;font-size:13px;margin:0">
                ⏰ <strong>This invitation expires on {exp_str}.</strong>
                After that the link will no longer work.
              </p>
            </td></tr>
          </table>

          <!-- Fallback link -->
          <p style="color:#9ca3af;font-size:13px;margin:0 0 6px">
            Button not working? Paste this link into your browser:
          </p>
          <p style="font-size:12px;margin:0;word-break:break-all">
            <a href="{invite_url}" style="color:#6366f1">{invite_url}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 36px;
                       border-top:1px solid #e5e7eb;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6">
            If you didn&rsquo;t expect this invitation, you can safely ignore
            this email &mdash; no account will be created.<br/>
            &copy; MyFamilyFit
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

        text = (
            f"{invited_by} has invited you to join {family_name} on MyFamilyFit.\n\n"
            f"Accept your invitation here:\n{invite_url}\n\n"
            f"This link expires on {exp_str}.\n\n"
            "If you didn't expect this email, ignore it — no account will be created."
        )

        return self.send(to=to_email, subject=subject, html=html, text=text)


# ── SMTP implementation ───────────────────────────────────────────────────────

class SMTPEmailService(BaseEmailService):
    def is_configured(self) -> bool:
        return settings.smtp_configured

    def send(self, *, to: str, subject: str, html: str, text: str) -> bool:
        if not self.is_configured():
            logger.info("SMTP not configured — skipping email to %s", to)
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = settings.SMTP_FROM
            msg["To"]      = to
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html,  "html"))

            if settings.SMTP_TLS:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.ehlo()
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM, to, msg.as_string())
            else:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM, to, msg.as_string())

            logger.info("Email sent to %s", to)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to, exc)
            return False


# ── Singleton ─────────────────────────────────────────────────────────────────

email_service: BaseEmailService = SMTPEmailService()
