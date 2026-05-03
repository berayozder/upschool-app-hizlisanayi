from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from core.auth import CurrentUser
from core.supabase_client import supabase_admin

router = APIRouter()


@router.post("/jobs/{job_id}/contact")
async def log_contact(job_id: str, user_id: str = CurrentUser) -> dict:
    """
    Log a WhatsApp contact event for a provider viewing a seeker's job.
    Idempotent — duplicate contact for same provider+job returns 200 silently.
    Returns 410 Gone if job is no longer active.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Fetch job to validate it is still active
    job_response = (
        supabase_admin
        .from_("jobs")
        .select("id, seeker_id, status, expires_at")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )

    if not job_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="İlan bulunamadı.")

    job = job_response.data

    if job["status"] != "active" or job["expires_at"] < now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Bu ilan artık aktif değil.",
        )

    # Insert contact log — silently ignore unique constraint violations
    try:
        supabase_admin.from_("contact_logs").insert(
            {
                "job_id": job_id,
                "provider_id": user_id,
                "seeker_id": job["seeker_id"],
            }
        ).execute()
    except Exception as e:
        error_str = str(e)
        if "23505" not in error_str:  # Not a unique violation
            raise

    return {"success": True}
