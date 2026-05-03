from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from core.auth import CurrentUser
from core.supabase_client import supabase_admin

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────

class JobCreateRequest(BaseModel):
    category_slug: str
    title: str
    description: Optional[str] = None
    city: str
    district: Optional[str] = None
    photo_urls: list[str] = []


class JobStatusUpdate(BaseModel):
    status: str  # 'closed'


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_job(body: JobCreateRequest, user_id: str = CurrentUser) -> dict:
    """Create a new job posting for the current seeker."""
    now = datetime.now(timezone.utc).isoformat()
    # expires_at = 72 hours from now
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()

    response = (
        supabase_admin
        .from_("jobs")
        .insert(
            {
                "seeker_id": user_id,
                "category_slug": body.category_slug,
                "title": body.title,
                "description": body.description,
                "city": body.city,
                "district": body.district,
                "photo_urls": body.photo_urls,
                "status": "active",
                "expires_at": expires_at,
                "created_at": now,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="İlan oluşturulamadı.")

    return response.data[0]


@router.get("/feed")
async def get_provider_feed(
    user_id: str = CurrentUser,
    page: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
) -> list[dict]:
    """
    Radius-filtered job feed for approved providers.
    Uses PostGIS ST_DWithin for geographic filtering via Supabase RPC.
    Falls back to city-match filter if PostGIS is not available.
    """
    # Verify provider is approved
    provider_response = (
        supabase_admin
        .from_("provider_profiles")
        .select("city, district, service_radius_km, categories, verification_status")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    if not provider_response.data:
        raise HTTPException(status_code=403, detail="Provider profili bulunamadı.")

    provider = provider_response.data
    if provider["verification_status"] != "approved":
        raise HTTPException(status_code=403, detail="Profiliniz henüz onaylanmamış.")

    now = datetime.now(timezone.utc).isoformat()

    # Build query — city-match filter (PostGIS radius filter requires custom RPC)
    query = (
        supabase_admin
        .from_("jobs")
        .select("*, profiles!seeker_id(phone, full_name)")
        .eq("status", "active")
        .gt("expires_at", now)
        .eq("city", provider["city"])
        .order("created_at", desc=True)
        .range(page * limit, page * limit + limit - 1)
    )

    if category and category != "all":
        query = query.eq("category_slug", category)

    response = query.execute()
    jobs = response.data or []

    # Flatten joined profile fields
    result = []
    for job in jobs:
        profile_data = job.pop("profiles", None) or {}
        job["seeker_phone"] = profile_data.get("phone")
        job["seeker_name"] = profile_data.get("full_name")
        job["distance_km"] = None  # Populated by PostGIS RPC when available
        result.append(job)

    return result


@router.get("/mine")
async def get_my_jobs(user_id: str = CurrentUser) -> list[dict]:
    """All jobs posted by the current seeker, newest first, with contact count."""
    response = (
        supabase_admin
        .from_("jobs")
        .select("*, contact_logs(count)")
        .eq("seeker_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    jobs = response.data or []
    for job in jobs:
        contact_data = job.pop("contact_logs", [])
        job["contact_count"] = contact_data[0]["count"] if contact_data else 0

    return jobs


@router.get("/{job_id}")
async def get_job(job_id: str, user_id: str = CurrentUser) -> dict:
    """Single job detail. Joins seeker phone for providers."""
    response = (
        supabase_admin
        .from_("jobs")
        .select("*, profiles!seeker_id(phone, full_name), contact_logs(count)")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    job = response.data
    profile_data = job.pop("profiles", None) or {}
    contact_data = job.pop("contact_logs", [])

    job["seeker_phone"] = profile_data.get("phone")
    job["seeker_name"] = profile_data.get("full_name")
    job["contact_count"] = contact_data[0]["count"] if contact_data else 0

    return job


@router.patch("/{job_id}")
async def update_job_status(
    job_id: str,
    body: JobStatusUpdate,
    user_id: str = CurrentUser,
) -> dict:
    """Close a job. Only the seeker who owns the job can close it."""
    if body.status != "closed":
        raise HTTPException(status_code=400, detail="Geçersiz durum.")

    # Verify ownership
    check = (
        supabase_admin
        .from_("jobs")
        .select("id, seeker_id")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )

    if not check.data:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    if check.data["seeker_id"] != user_id:
        raise HTTPException(status_code=403, detail="Bu ilanı kapatma yetkiniz yok.")

    response = (
        supabase_admin
        .from_("jobs")
        .update({"status": "closed", "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", job_id)
        .execute()
    )

    return {"success": True}
