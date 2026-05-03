from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Hızlısanayi API",
    version="1.0.0",
    description="Backend API for Hızlısanayi — the industrial service marketplace.",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow all origins for MVP. Restrict to app domain before production launch.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Imported here so they can be registered as they are built in Phase 12.
from routers import jobs, providers, contact, push_tokens, webhooks  # noqa: E402

app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(providers.router, prefix="/providers", tags=["providers"])
app.include_router(contact.router, tags=["contact"])
app.include_router(push_tokens.router, prefix="/push-tokens", tags=["push-tokens"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
