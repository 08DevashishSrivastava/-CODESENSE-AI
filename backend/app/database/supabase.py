import logging
from typing import Optional
from supabase import create_client, Client
from ..config import settings

logger = logging.getLogger(__name__)

class SupabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self._init_client()

    def _init_client(self):
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("[CodeSense AI] Connected to Supabase client successfully.")
            except Exception as e:
                logger.warning(f"[CodeSense AI] Failed connecting to Supabase: {e}")
                self.client = None
        else:
            logger.info("[CodeSense AI] Supabase credentials not provided. Running in guest/local mode.")

    @property
    def is_available(self) -> bool:
        return self.client is not None

    def verify_token(self, token: str) -> Optional[dict]:
        """Validates a Supabase JWT token and extracts user info."""
        if not self.is_available or not token:
            return None
        try:
            res = self.client.auth.get_user(token)
            if res and res.user:
                return {
                    "id": str(res.user.id),
                    "email": str(res.user.email)
                }
        except Exception as e:
            logger.debug(f"[CodeSense AI] Token verification failed: {e}")
        return None

supabase_manager = SupabaseManager()
