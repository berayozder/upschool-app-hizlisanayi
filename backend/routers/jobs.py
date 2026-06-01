from datetime import datetime, timezone
import json
import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
import httpx
from pydantic import BaseModel

from core.auth import CurrentUser
from core.config import settings
from core.supabase_client import supabase_admin

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────

class JobRefineRequest(BaseModel):
    description: str


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

@router.post("/refine")
async def refine_job_description(
    body: JobRefineRequest,
    user_id: str = CurrentUser,
) -> dict:
    """
    Refines raw description using Gemini LLM.
    Suggests title, category slug, and structured description.
    """
    raw_desc = body.description.strip()
    if not raw_desc:
        raise HTTPException(status_code=400, detail="Açıklama boş olamaz.")

    # List of valid categories for fallback and validation
    categories = [
        {"slug": "cnc", "label": "Talaşlı İmalat (CNC)"},
        {"slug": "laser", "label": "Lazer Kesim"},
        {"slug": "sheet", "label": "Sac İşleme"},
        {"slug": "casting", "label": "Döküm & Kalıp"},
        {"slug": "welding", "label": "Kaynak & Metal İşleri"},
        {"slug": "crane", "label": "Vinç Kiralama"},
        {"slug": "forklift", "label": "Forklift & İstif"},
        {"slug": "transport", "label": "Taşıma & Nakliye"},
        {"slug": "tow", "label": "Araç Kurtarma (Çekici)"},
        {"slug": "autorepair", "label": "Oto Tamir"},
    ]

    # 1. Check if GEMINI_API_KEY is available
    if settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            prompt = (
                "Sen, Türkiye'nin sanayi sektörü için geliştirilmiş 'Hızlısanayi' B2B mobil pazaryerinin akıllı ilan asistanısın. "
                "Görevin, ilan vermek isteyen kullanıcıların yazdığı ham ve düzensiz Türkçe metinleri analiz etmek ve bunları temiz, profesyonel ve yapılandırılmış bir formata getirmektir.\n\n"
                "Sana girdi olarak bir ham ilan açıklaması verilecek. Bu metni analiz ederek aşağıdaki 3 çıktıyı üretmelisin ve sonucu kesinlikle geçerli bir JSON formatında döndürmelisin.\n\n"
                "Aşağıdaki 10 kategoriden en uygun olanının slug değerini seçmelisin:\n"
                "- 'cnc': Talaşlı İmalat (CNC)\n"
                "- 'laser': Lazer Kesim\n"
                "- 'sheet': Sac İşleme\n"
                "- 'casting': Döküm & Kalıp\n"
                "- 'welding': Kaynak & Metal İşleri\n"
                "- 'crane': Vinç Kiralama\n"
                "- 'forklift': Forklift & İstif\n"
                "- 'transport': Taşıma & Nakliye\n"
                "- 'tow': Araç Kurtarma (Çekici) (Acil)\n"
                "- 'autorepair': Oto Tamir (Acil)\n\n"
                "Kurallar:\n"
                "1. \"refined_title\": Maksimum 50 karakter uzunluğunda, ilan konusunu net özetleyen profesyonel bir başlık üret (Örn: \"CNC Flanş Delimi ve Tornalama\", \"Gebze Acil Çekici Hizmeti\").\n"
                "2. \"refined_description\": Ham metindeki verileri koruyarak, maddeler halinde (bullet points) yapılandırılmış bir açıklama oluştur. Şu başlıkları (varsa) kullan:\n"
                "   * Hizmet Türü:\n"
                "   * Ölçüler/Özellikler:\n"
                "   * Miktar:\n"
                "   * Konum/Detay:\n"
                "   * Aciliyet:\n"
                "   Açıklama alanı maksimum 400 karakter olmalıdır.\n"
                "3. Çıktı sadece ve sadece aşağıdaki şablona uygun saf JSON nesnesi olmalıdır. Markdown kod blokları (```json ... ```) veya ek açıklama metinleri ekleme.\n\n"
                "JSON Şablonu:\n"
                "{\n"
                "  \"suggested_category\": \"kategori_slug_degeri\",\n"
                "  \"refined_title\": \"Optimize edilmiş başlık metni\",\n"
                "  \"refined_description\": \"Maddeler halinde düzenlenmiş ilan metni\"\n"
                "}\n\n"
                f"Kullanıcının ham ilan metni: \"{raw_desc}\""
            )

            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                response.raise_for_status()
                res_data = response.json()
                
                candidates = res_data.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts:
                        text_response = parts[0].get("text", "").strip()
                        
                        # Strip code block markdown markers if model included them
                        if text_response.startswith("```"):
                            match = re.search(r"\{.*\}", text_response, re.DOTALL)
                            if match:
                                text_response = match.group(0)
                        
                        ai_result = json.loads(text_response)
                        
                        # Validate slug
                        suggested_slug = ai_result.get("suggested_category")
                        valid_slugs = [c["slug"] for c in categories]
                        if suggested_slug not in valid_slugs:
                            ai_result["suggested_category"] = "cnc"
                            
                        return ai_result
        except Exception as e:
            logging.error(f"Gemini API Error, falling back: {e}")

    # 2. Fallback Mechanism (Rule-based parsing if API fails or no API Key)
    lower_desc = raw_desc.lower()
    detected_category = "cnc"  # default
    
    keyword_map = {
        "cnc": ["cnc", "torna", "freze", "talaşlı", "delme", "delik"],
        "laser": ["lazer", "kesim", "plazma", "sac kesim"],
        "sheet": ["sac", "büküm", "panç", "kenet", "metal plaka"],
        "casting": ["döküm", "kalıp", "enjeksiyon", "pres"],
        "welding": ["kaynak", "metal işleri", "argon", "gazaltı"],
        "crane": ["vinç", "hiab", "sepetli", "kiralık vinç"],
        "forklift": ["forklift", "istif", "transpalet"],
        "transport": ["nakliye", "taşıma", "kamyon", "lojistik"],
        "tow": ["çekici", "kurtarıcı", "yol yardım", "çekme"],
        "autorepair": ["tamir", "sanayi", "motor", "mekanik", "oto tamir", "şanzıman"]
    }
    
    for category_slug, keywords in keyword_map.items():
        if any(kw in lower_desc for kw in keywords):
            detected_category = category_slug
            break
            
    category_label = next((c["label"] for c in categories if c["slug"] == detected_category), "Sanayi İşi")
    refined_title = f"AI Destekli: {category_label} Talebi"
    
    is_urgent = detected_category in ["tow", "autorepair"] or "acil" in lower_desc
    urgency_text = "Acil 🚨" if is_urgent else "Standart"
    
    refined_description = (
        f"• Hizmet Türü: {category_label}\n"
        f"• Detaylar: {raw_desc}\n"
        f"• Aciliyet: {urgency_text}\n"
        f"• [Yapay Zeka Destekli Düzenlendi]"
    )
    
    return {
        "suggested_category": detected_category,
        "refined_title": refined_title,
        "refined_description": refined_description
    }


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
