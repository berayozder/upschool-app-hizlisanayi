import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status

from core.config import settings
from core.supabase_client import supabase_admin
from services.push_service import notify_provider, notify_verification_result

router = APIRouter()
logger = logging.getLogger(__name__)

URGENT_SLUGS = {"tow", "autorepair"}


def _verify_webhook_secret(authorization: str = Header(...)) -> None:
    """Verify the Authorization header matches the Supabase webhook secret."""
    expected = f"Bearer {settings.SUPABASE_WEBHOOK_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz webhook token.")


@router.post("/verification-changed")
async def verification_changed(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
) -> dict:
    """
    Supabase webhook: fires when provider_profiles.verification_status changes.
    Sends a push notification to the provider with the outcome.
    """
    _verify_webhook_secret(authorization)

    payload: dict[str, Any] = await request.json()
    record = payload.get("record", {})
    old_record = payload.get("old_record", {})

    new_status = record.get("verification_status")
    old_status = old_record.get("verification_status")

    if new_status == old_status:
        return {"message": "Status unchanged — no notification sent."}

    provider_id: str = record.get("id", "")

    if new_status == "approved":
        background_tasks.add_task(notify_verification_result, provider_id, True)
    elif new_status == "rejected":
        reason = record.get("rejection_reason")
        background_tasks.add_task(notify_verification_result, provider_id, False, reason)

    return {"success": True}


@router.post("/new-job")
async def new_job_posted(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
) -> dict:
    """
    Supabase webhook: fires when a new job is inserted.
    Notifies approved providers within radius whose categories match.
    """
    _verify_webhook_secret(authorization)

    payload: dict[str, Any] = await request.json()
    record = payload.get("record", {})

    job_id: str = record.get("id", "")
    job_city: str = record.get("city", "")
    category_slug: str = record.get("category_slug", "")
    is_urgent = category_slug in URGENT_SLUGS

    # Find matching approved providers by city + category overlap
    # (PostGIS radius filtering can replace city match once geo coordinates are stored)
    providers_response = (
        supabase_admin
        .from_("provider_profiles")
        .select("id, categories")
        .eq("verification_status", "approved")
        .eq("city", job_city)
        .execute()
    )

    matching_providers = [
        p["id"]
        for p in (providers_response.data or [])
        if category_slug in (p.get("categories") or [])
    ]

    if not matching_providers:
        return {"success": True, "notified": 0}

    title = f"Yeni İlan: {category_slug.upper()}"
    body = f"{job_city} bölgesinde yeni bir {category_slug} işi var."
    data = {"jobId": job_id, "type": "new_job"}

    for provider_id in matching_providers:
        if is_urgent:
            # Urgent jobs: send immediately (synchronously within request)
            await notify_provider(provider_id, title, body, data)
        else:
            # Standard jobs: fire-and-forget via BackgroundTasks
            background_tasks.add_task(notify_provider, provider_id, title, body, data)

    return {"success": True, "notified": len(matching_providers)}
