from fastapi import APIRouter, Depends, Header
from typing import Optional, List, Dict, Any
from ..database.supabase import supabase_manager
from ..database.repositories import history_repo

router = APIRouter(prefix="/api/v1/diagnostics", tags=["Diagnostics"])

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return supabase_manager.verify_token(token)

@router.get("/history")
async def get_diagnostic_history(user: Optional[dict] = Depends(get_optional_user)) -> List[Dict[str, Any]]:
    user_id = user["id"] if user else None
    return await history_repo.get_history(user_id)
