import logging
from typing import List, Optional
from .provider import ai_provider
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .validator import AIResponseValidator
from ..schemas.requests import ProblemContext
from ..schemas.diagnostics import Diagnostic

logger = logging.getLogger(__name__)

class AIBugDetector:
    def __init__(self):
        self.provider = ai_provider

    async def analyze(
        self,
        language: str,
        code: str,
        problem_context: Optional[ProblemContext],
        static_diagnostics: List[Diagnostic]
    ) -> List[Diagnostic]:
        if not self.provider.is_configured:
            return []

        user_prompt = build_user_prompt(language, code, problem_context, static_diagnostics)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]

        raw_output = await self.provider.chat_completion(messages, temperature=0.1)
        if not raw_output:
            return []

        return AIResponseValidator.validate(raw_output, code, language)

ai_bug_detector = AIBugDetector()
