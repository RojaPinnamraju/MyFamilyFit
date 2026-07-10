"""
Expo push notification sender.
Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def is_expo_token(token: str) -> bool:
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    sound: str = "default",
) -> bool:
    """Send a single Expo push notification (synchronous, for use in scheduler thread)."""
    if not token or not is_expo_token(token):
        logger.debug("Skipping push — no valid Expo token: %s", token)
        return False

    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": sound,
        "data": data or {},
    }

    try:
        response = httpx.post(EXPO_PUSH_URL, json=payload, timeout=10)
        result = response.json()
        ticket = result.get("data", {})
        if ticket.get("status") == "error":
            logger.warning("Expo push error for %s: %s", token, ticket.get("message"))
            return False
        logger.info("Push sent to %s: %s", token[:30], title)
        return True
    except Exception as exc:
        logger.error("Failed to send push notification: %s", exc)
        return False


def send_push_batch(messages: list[dict]) -> list:
    """Send up to 100 notifications in a single Expo API call."""
    if not messages:
        return []
    try:
        response = httpx.post(EXPO_PUSH_URL, json=messages, timeout=15)
        return response.json().get("data", [])
    except Exception as exc:
        logger.error("Batch push failed: %s", exc)
        return []
