import logging
from typing import Optional

import httpx

from core.config import settings
from core.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

EXPO_CHUNK_SIZE = 100  # Expo API batch limit


async def send_push_notifications(
    tokens: list[str],
    title: str,
    body: str,
    data: dict,
) -> None:
    """
    Send push notifications via the Expo Push HTTP API.
    Batches tokens into groups of 100 (Expo limit).
    Logs per-token delivery errors without crashing.
    """
    if not tokens:
        return

    messages = [
        {"to": token, "title": title, "body": body, "data": data, "sound": "default"}
        for token in tokens
    ]

    # Split into chunks of EXPO_CHUNK_SIZE
    chunks = [messages[i : i + EXPO_CHUNK_SIZE] for i in range(0, len(messages), EXPO_CHUNK_SIZE)]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for chunk in chunks:
            try:
                response = await client.post(
                    settings.EXPO_PUSH_API_URL,
                    json=chunk,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()

                # Log any per-message errors returned by Expo
                result = response.json()
                for item in result.get("data", []):
                    if item.get("status") == "error":
                        logger.warning(
                            "Push delivery error for token %s: %s",
                            item.get("details", {}).get("error", "unknown"),
                            item.get("message"),
                        )
            except httpx.HTTPError as exc:
                logger.error("Push notification HTTP error: %s", exc)


async def notify_provider(
    provider_id: str,
    title: str,
    body: str,
    data: dict,
) -> None:
    """Fetch all push tokens for a provider and send a push notification."""
    response = (
        supabase_admin
        .from_("push_tokens")
        .select("token")
        .eq("user_id", provider_id)
        .execute()
    )

    tokens = [row["token"] for row in (response.data or [])]
    await send_push_notifications(tokens, title, body, data)


async def notify_verification_result(
    provider_id: str,
    approved: bool,
    reason: Optional[str] = None,
) -> None:
    """Send a push notification informing a provider of their verification outcome."""
    if approved:
        title = "Başvurunuz Onaylandı ✓"
        body = "Artık bölgenizdeki ilanları görebilir ve teklif verebilirsiniz."
    else:
        reason_text = f" Sebep: {reason}" if reason else ""
        title = "Başvurunuz Reddedildi"
        body = f"Lütfen profilinizi güncelleyerek tekrar başvurun.{reason_text}"

    await notify_provider(provider_id, title, body, {"type": "verification", "approved": approved})
