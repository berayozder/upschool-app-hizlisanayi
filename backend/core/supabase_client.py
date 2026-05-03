from supabase import create_client, Client
from core.config import settings

# Service-role client bypasses RLS — only use server-side, never expose to clients
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)
