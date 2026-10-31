import logging
from typing import Dict, Any, Optional, List
from .supabase import supabase_manager
from ..schemas.requests import UserSettingsUpdate

logger = logging.getLogger(__name__)

# Default in-memory settings for guest mode
DEFAULT_GUEST_SETTINGS = {
    "voice_enabled": True,
    "voice_language": "en-US",
    "voice_personality": "professional",
    "profanity_enabled": False,
    "custom_voice_templates": {},
    "speech_rate": 1.0,
    "speech_volume": 1.0,
    "alert_cooldown": 3000,
    "enabled_languages": ["java", "python", "cpp", "javascript", "c"],
    "analysis_mode": "hybrid",
    "save_history": False
}

class SettingsRepository:
    def __init__(self):
        self._guest_store: Dict[str, Dict[str, Any]] = {}

    async def get_settings(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        if user_id and supabase_manager.is_available:
            try:
                res = supabase_manager.client.table("user_settings").select("*").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"[CodeSense AI] Failed fetching user settings from Supabase: {e}")

        return self._guest_store.get(user_id or "guest", DEFAULT_GUEST_SETTINGS.copy())

    async def update_settings(self, updates: UserSettingsUpdate, user_id: Optional[str] = None) -> Dict[str, Any]:
        data = {k: v for k, v in updates.model_dump().items() if v is not None}
        if user_id and supabase_manager.is_available:
            try:
                res = supabase_manager.client.table("user_settings").upsert({
                    "user_id": user_id,
                    **data
                }).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"[CodeSense AI] Failed upserting settings to Supabase: {e}")

        current = await self.get_settings(user_id)
        current.update(data)
        self._guest_store[user_id or "guest"] = current
        return current

class DiagnosticHistoryRepository:
    def __init__(self):
        self._in_memory_history: List[Dict[str, Any]] = []

    async def save_diagnostic(
        self,
        user_id: Optional[str],
        platform: str,
        language: str,
        problem_title: str,
        error_type: str,
        line_number: int,
        confidence: float,
        error_message: str
    ):
        record = {
            "platform": platform,
            "language": language,
            "problem_title": problem_title,
            "error_type": error_type,
            "line_number": line_number,
            "confidence": confidence,
            "error_message": error_message
        }

        if user_id and supabase_manager.is_available:
            try:
                supabase_manager.client.table("diagnostic_history").insert({
                    "user_id": user_id,
                    **record
                }).execute()
                return
            except Exception as e:
                logger.warning(f"[CodeSense AI] Failed inserting to Supabase diagnostic_history: {e}")

        # Store in bounded in-memory list
        self._in_memory_history.append(record)
        if len(self._in_memory_history) > 100:
            self._in_memory_history.pop(0)

    async def get_history(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if user_id and supabase_manager.is_available:
            try:
                res = supabase_manager.client.table("diagnostic_history").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"[CodeSense AI] Failed querying diagnostic_history: {e}")

        return list(reversed(self._in_memory_history))

settings_repo = SettingsRepository()
history_repo = DiagnosticHistoryRepository()
