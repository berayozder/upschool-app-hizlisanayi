"""
Local integration test suite for Hızlısanayi FastAPI backend.
Creates a temporary test user → runs all endpoint tests → cleans up.
"""
import sys
import json
import requests
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

BASE_URL = "http://localhost:8000"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "✅"
FAIL = "❌"
results = []

def check(label: str, condition: bool, detail: str = ""):
    icon = PASS if condition else FAIL
    msg = f"  {icon} {label}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    results.append(condition)
    return condition

def h(title: str):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print(f"{'─'*50}")

# ── Setup: create test user via admin API ─────────────────────────────────────

h("SETUP — Creating test user")
admin = create_client(SUPABASE_URL, SERVICE_KEY)

TEST_PHONE = "+905550000099"
TEST_EMAIL = "test-hizlisanayi@example.com"

# Create test user
try:
    user_resp = admin.auth.admin.create_user({
        "phone": TEST_PHONE,
        "phone_confirm": True,
        "email": TEST_EMAIL,
        "password": "TestPass123!",
        "email_confirm": True,
    })
    test_user_id = user_resp.user.id
    print(f"  Created test user: {test_user_id}")
except Exception as e:
    # May already exist from previous run
    print(f"  User may already exist: {e}")
    users = admin.auth.admin.list_users()
    existing = [u for u in users if getattr(u, 'phone', '') == TEST_PHONE]
    if existing:
        test_user_id = existing[0].id
        print(f"  Reusing existing user: {test_user_id}")
    else:
        print("  FATAL: cannot create or find test user")
        sys.exit(1)

# Get a session token via sign_in_with_password (using email)
try:
    session_resp = admin.auth.sign_in_with_password({
        "email": TEST_EMAIL,
        "password": "TestPass123!",
    })
    TOKEN = session_resp.session.access_token
    print(f"  Got access token: {TOKEN[:30]}...")
except Exception as e:
    print(f"  FATAL: cannot get session token: {e}")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Ensure profiles row exists (normally created by DB trigger on auth.users insert)
# We do NOT pre-create provider_profiles — that's what we test below
admin.from_("profiles").upsert({
    "id": test_user_id,
    "phone": TEST_PHONE,
    "active_role": "seeker",
    "full_name": "Test User",
}, on_conflict="id").execute()

# ── Test 1: Health ────────────────────────────────────────────────────────────
h("TEST 1 — Health endpoint")
r = requests.get(f"{BASE_URL}/health")
check("GET /health → 200", r.status_code == 200)
check("Returns {status: ok}", r.json().get("status") == "ok", str(r.json()))

# ── Test 2: Auth rejection ────────────────────────────────────────────────────
h("TEST 2 — Auth guard")
r = requests.get(f"{BASE_URL}/providers/me")
check("GET /providers/me without token → 422 or 401", r.status_code in (401, 422))

r = requests.get(f"{BASE_URL}/providers/me", headers={"Authorization": "Bearer invalidtoken"})
check("GET /providers/me with bad token → 401", r.status_code == 401)

# ── Test 3: Provider registration ────────────────────────────────────────────
h("TEST 3 — Provider registration")
r = requests.get(f"{BASE_URL}/providers/me", headers=HEADERS)
# Supabase DB trigger may auto-create a provider_profiles row; accept 404 or 200
check("GET /providers/me (before register) → not 500", r.status_code in (200, 404), f"got {r.status_code}")

payload = {
    "company_name": "Test Makina Sanayi",
    "vergi_no": "1234567890",
    "categories": ["cnc", "laser"],
    "city": "Kocaeli",
    "district": "Gebze",
    "service_radius_km": 50,
}
r = requests.post(f"{BASE_URL}/providers/register", json=payload, headers=HEADERS)
check("POST /providers/register → 201", r.status_code == 201, str(r.json()))

# Duplicate vergi_no
r2 = requests.post(f"{BASE_URL}/providers/register", json=payload, headers=HEADERS)
# Should be 409 or 201 (upsert on same user is fine, conflict is only on different user)
check("POST /providers/register same user → not 500", r2.status_code != 500)

r = requests.get(f"{BASE_URL}/providers/me", headers=HEADERS)
check("GET /providers/me after register → 200", r.status_code == 200)
if r.status_code == 200:
    check("Provider profile has correct company name", r.json().get("company_name") == "Test Makina Sanayi")
    check("verification_status is pending", r.json().get("verification_status") == "pending")

# ── Test 4: Provider feed (not approved yet) ──────────────────────────────────
h("TEST 4 — Provider feed (not approved)")
r = requests.get(f"{BASE_URL}/jobs/feed", headers=HEADERS)
check("GET /jobs/feed (pending) → 403", r.status_code == 403, r.text[:100])

# Manually approve provider for feed test
admin.from_("provider_profiles").update({
    "verification_status": "approved"
}).eq("id", test_user_id).execute()
print("  (Manually approved provider for feed test)")

r = requests.get(f"{BASE_URL}/jobs/feed", headers=HEADERS)
check("GET /jobs/feed (approved) → 200", r.status_code == 200, r.text[:80])
check("Feed returns a list", isinstance(r.json(), list))

r = requests.get(f"{BASE_URL}/jobs/feed?category=cnc", headers=HEADERS)
check("GET /jobs/feed?category=cnc → 200", r.status_code == 200)

# ── Test 5: Jobs (seeker flow) ────────────────────────────────────────────────
h("TEST 5 — Job creation (seeker flow)")
r = requests.get(f"{BASE_URL}/jobs/mine", headers=HEADERS)
check("GET /jobs/mine → 200", r.status_code == 200)
check("Mine returns list", isinstance(r.json(), list))

job_payload = {
    "category_slug": "cnc",
    "title": "CNC Test Islem - Kocaeli",
    "description": "Bu bir test ilanidır.",
    "city": "Kocaeli",
    "district": "Gebze",
    "photo_urls": [],
}
r = requests.post(f"{BASE_URL}/jobs", json=job_payload, headers=HEADERS)
check("POST /jobs → 201", r.status_code == 201, r.text[:100])

if r.status_code == 201:
    job_id = r.json().get("id")
    check("Job has an ID", bool(job_id))

    r2 = requests.get(f"{BASE_URL}/jobs/{job_id}", headers=HEADERS)
    check("GET /jobs/{id} → 200", r2.status_code == 200)
    check("Job has correct title", r2.json().get("title") == "CNC Test Islem - Kocaeli")

    # Test contact log
    h("TEST 6 — Contact log")
    r3 = requests.post(f"{BASE_URL}/jobs/{job_id}/contact", headers=HEADERS)
    check("POST /jobs/{id}/contact → 200", r3.status_code == 200, r3.text)

    r4 = requests.post(f"{BASE_URL}/jobs/{job_id}/contact", headers=HEADERS)
    check("POST /jobs/{id}/contact again (idempotent) → 200", r4.status_code == 200)

    # Close job
    h("TEST 7 — Close job")
    r5 = requests.patch(f"{BASE_URL}/jobs/{job_id}", json={"status": "closed"}, headers=HEADERS)
    check("PATCH /jobs/{id} status=closed → 200", r5.status_code == 200, r5.text)

    r6 = requests.get(f"{BASE_URL}/jobs/{job_id}", headers=HEADERS)
    check("Job status is now 'closed'", r6.json().get("status") == "closed")

# ── Test 8: Push tokens ───────────────────────────────────────────────────────
h("TEST 8 — Push tokens")
r = requests.post(
    f"{BASE_URL}/push-tokens",
    json={"token": "ExponentPushToken[test-token-123]", "platform": "ios"},
    headers=HEADERS,
)
check("POST /push-tokens → 200", r.status_code == 200, r.text)

r = requests.delete(f"{BASE_URL}/push-tokens", headers=HEADERS)
check("DELETE /push-tokens → 200", r.status_code == 200)

# ── Cleanup ───────────────────────────────────────────────────────────────────
h("CLEANUP")
try:
    admin.auth.admin.delete_user(test_user_id)
    admin.from_("provider_profiles").delete().eq("id", test_user_id).execute()
    print("  Test user deleted")
except Exception as e:
    print(f"  Cleanup warning: {e}")

# ── Summary ───────────────────────────────────────────────────────────────────
h("SUMMARY")
passed = sum(results)
total = len(results)
print(f"\n  {passed}/{total} checks passed\n")
if passed == total:
    print("  🎉 All tests passed! Backend is ready for deployment.")
else:
    print(f"  ⚠️  {total - passed} checks failed. Review output above.")
    sys.exit(1)
