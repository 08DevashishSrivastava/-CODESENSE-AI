from fastapi import APIRouter, Depends, Header
from typing import Optional
from ..schemas.responses import UsageResponse
from ..services.usage_service import usage_service
from ..database.supabase import supabase_manager

router = APIRouter(prefix="/api/v1/usage", tags=["Usage"])

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return supabase_manager.verify_token(token)

@router.get("", response_model=UsageResponse)
async def get_usage(user: Optional[dict] = Depends(get_optional_user)):
    user_id = user["id"] if user else None
    records = usage_service.get_records(user_id)
    return UsageResponse(
        total_analyses=len(records),
        records=records
    )
