import logging
import httpx
from typing import Optional, Dict, Any
from ..config import settings

logger = logging.getLogger(__name__)

class AIProvider:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = settings.OPENAI_BASE_URL.rstrip("/")
        self.model = settings.OPENAI_MODEL
        self.timeout = settings.AI_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def chat_completion(self, messages: list, temperature: float = 0.1) -> Optional[str]:
        if not self.is_configured:
            logger.debug("[CodeSense AI] No API key configured for AI provider.")
            return None

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"].get("content", "")
                else:
                    logger.warning(f"[CodeSense AI] LLM provider error {res.status_code}: {res.text}")
                    return None
            except Exception as e:
                logger.warning(f"[CodeSense AI] LLM provider request exception: {e}")
                return None

ai_provider = AIProvider()
