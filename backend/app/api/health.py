from fastapi import APIRouter
from ..schemas.responses import HealthResponse
from ..config import settings
from ..ai.provider import ai_provider
from ..database.supabase import supabase_manager

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def get_health():
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        ai_available=ai_provider.is_configured,
        supabase_available=supabase_manager.is_available
    )
