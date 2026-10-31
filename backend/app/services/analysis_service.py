import time
import hashlib
from typing import Dict, List, Tuple, Optional
from ..schemas.requests import AnalyzeRequest
from ..schemas.responses import AnalyzeResponse
from ..schemas.diagnostics import Diagnostic
from ..analyzers.static_engine import static_engine
from ..ai.analyzer import ai_bug_detector
from .voice_service import voice_service

class AnalysisService:
    def __init__(self):
        # Cache: hash -> (timestamp, List[Diagnostic], Optional[str])
        self._cache: Dict[str, Tuple[float, List[Diagnostic], str]] = {}
        self._cache_ttl = 60.0 # 60 seconds TTL

    def _compute_hash(
        self,
        code: str,
        language: str,
        personality: str = "professional",
        profanity_enabled: bool = False
    ) -> str:
        raw = f"{language}:{personality}:{profanity_enabled}:{code}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def analyze(
        self,
        request: AnalyzeRequest,
        mode: str = "hybrid",
        user_lang: str = "en-US",
        personality: str = "professional",
        profanity_enabled: bool = False,
        custom_templates: Optional[Dict[str, str]] = None
    ) -> AnalyzeResponse:
        start_time = time.perf_counter()
        code_hash = self._compute_hash(request.code, request.language, personality, profanity_enabled)

        # Check Cache
        now = time.time()
        if code_hash in self._cache:
            ts, cached_diags, cached_voice = self._cache[code_hash]
            if now - ts < self._cache_ttl:
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AnalyzeResponse(
                    success=True,
                    code_version=request.code_version,
                    diagnostics=cached_diags,
                    analysis_status="cached",
                    voice_message=cached_voice,
                    processing_time_ms=elapsed_ms
                )

        merged_diagnostics: List[Diagnostic] = []

        # Stage 1: Fast Static Analysis
        if mode in ("static", "hybrid"):
            static_diags = static_engine.analyze(request.code, request.language)
            merged_diagnostics.extend(static_diags)

        # Stage 2: AI Logical Error Detection
        if mode in ("ai", "hybrid"):
            fatal_syntax = any(d.category == "syntax" and d.severity == "error" for d in merged_diagnostics)
            if not fatal_syntax or mode == "ai":
                ai_diags = await ai_bug_detector.analyze(
                    language=request.language,
                    code=request.code,
                    problem_context=request.problem_context,
                    static_diagnostics=merged_diagnostics
                )
                
                existing_keys = {f"{d.line}:{d.category}" for d in merged_diagnostics}
                for ad in ai_diags:
                    key = f"{ad.line}:{ad.category}"
                    if key not in existing_keys:
                        merged_diagnostics.append(ad)

        # Stage 3: Generate voice explanation matching selected personality
        voice_msg = voice_service.generate_message(
            diagnostics=merged_diagnostics,
            lang_code=user_lang,
            personality=personality,
            profanity_enabled=profanity_enabled,
            custom_templates=custom_templates
        )

        # Sort diagnostics by line number
        merged_diagnostics.sort(key=lambda d: d.line)

        # Update cache
        self._cache[code_hash] = (now, merged_diagnostics, voice_msg or "")

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return AnalyzeResponse(
            success=True,
            code_version=request.code_version,
            diagnostics=merged_diagnostics,
            analysis_status="completed",
            voice_message=voice_msg,
            processing_time_ms=elapsed_ms
        )

analysis_service = AnalysisService()
