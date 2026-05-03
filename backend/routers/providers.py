from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel

from core.auth import CurrentUser
from core.supabase_client import supabase_admin
from services.push_service import notify_provider

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────

class ProviderRegisterRequest(BaseModel):
    company_name: str
    vergi_no: str
    categories: list[str]
    city: str
    district: Optional[str] = None
    service_radius_km: int = 50


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_provider(
    body: ProviderRegisterRequest,
    user_id: str = CurrentUser,
) -> dict:
    """Register or update a provider profile. 409 on duplicate vergi_no."""
    now = datetime.now(timezone.utc).isoformat()

    response = (
        supabase_admin
        .from_("provider_profiles")
        .upsert(
            {
                "id": user_id,
                "company_name": body.company_name,
                "vergi_no": body.vergi_no,
                "categories": body.categories,
                "city": body.city,
                "district": body.district,
                "service_radius_km": body.service_radius_km,
                "verification_status": "pending",
                "updated_at": now,
            },
            on_conflict="id",
        )
        .execute()
    )

    if not response.data:
        # Check if it was a unique violation on vergi_no
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu vergi numarası zaten kayıtlı.",
        )

    return {"success": True}


@router.post("/upload-levha", status_code=status.HTTP_200_OK)
async def upload_levha(
    user_id: str = CurrentUser,
) -> dict:
    """
    Placeholder route — actual file upload is handled client-side via Supabase Storage SDK.
    This endpoint can be extended for server-side upload validation if needed.
    """
    return {"message": "Levha upload is handled client-side via Supabase Storage SDK."}


@router.get("/me")
async def get_my_provider_profile(user_id: str = CurrentUser) -> dict:
    """Return the current user's provider profile. 404 if not found."""
    try:
        response = (
            supabase_admin
            .from_("provider_profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        data = response.data
    except Exception:
        data = None

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profili bulunamadı.",
        )

    return data
