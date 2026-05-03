from typing import Literal

from fastapi import APIRouter, status
from pydantic import BaseModel

from core.auth import CurrentUser
from core.supabase_client import supabase_admin

router = APIRouter()


class PushTokenRequest(BaseModel):
    token: str
    platform: Literal["ios", "android"]


@router.post("", status_code=status.HTTP_200_OK)
async def register_push_token(
    body: PushTokenRequest,
    user_id: str = CurrentUser,
) -> dict:
    """
    Upsert a push token for the current user.
    On conflict on `token` (e.g. reinstall): update user_id.
    """
    supabase_admin.from_("push_tokens").upsert(
        {
            "user_id": user_id,
            "token": body.token,
            "platform": body.platform,
        },
        on_conflict="token",
    ).execute()

    return {"success": True}


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_push_tokens(user_id: str = CurrentUser) -> dict:
    """Delete all push tokens for the current user (notification opt-out)."""
    supabase_admin.from_("push_tokens").delete().eq("user_id", user_id).execute()
    return {"success": True}
