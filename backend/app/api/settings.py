from fastapi import APIRouter, Depends, Header
from typing import Optional, Dict, Any
from ..schemas.requests import UserSettingsUpdate
from ..database.supabase import supabase_manager
from ..database.repositories import settings_repo

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return supabase_manager.verify_token(token)

@router.get("")
async def get_user_settings(user: Optional[dict] = Depends(get_optional_user)) -> Dict[str, Any]:
    user_id = user["id"] if user else None
    return await settings_repo.get_settings(user_id)

@router.put("")
async def update_user_settings(
    updates: UserSettingsUpdate,
    user: Optional[dict] = Depends(get_optional_user)
) -> Dict[str, Any]:
    user_id = user["id"] if user else None
    return await settings_repo.update_settings(updates, user_id)
