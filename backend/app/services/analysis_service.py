import time
import hashlib
from typing import Dict, List, Tuple
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

    def _compute_hash(self, code: str, language: str) -> str:
        return hashlib.sha256(f"{language}:{code}".encode("utf-8")).hexdigest()

    async def analyze(
        self,
        request: AnalyzeRequest,
        mode: str = "hybrid",
        user_lang: str = "en-US"
    ) -> AnalyzeResponse:
        start_time = time.perf_counter()
        code_hash = self._compute_hash(request.code, request.language)

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

        # Stage 2: AI Logical Error Detection (only in ai or hybrid mode)
        if mode in ("ai", "hybrid"):
            # Only run AI if code has no fatal syntax errors or if user requested AI mode
            fatal_syntax = any(d.category == "syntax" and d.severity == "error" for d in merged_diagnostics)
            if not fatal_syntax or mode == "ai":
                ai_diags = await ai_bug_detector.analyze(
                    language=request.language,
                    code=request.code,
                    problem_context=request.problem_context,
                    static_diagnostics=merged_diagnostics
                )
                
                # Merge AI diagnostics without duplicating existing lines
                existing_keys = {f"{d.line}:{d.category}" for d in merged_diagnostics}
                for ad in ai_diags:
                    key = f"{ad.line}:{ad.category}"
                    if key not in existing_keys:
                        merged_diagnostics.append(ad)

        # Stage 3: Generate voice explanation
        voice_msg = voice_service.generate_message(merged_diagnostics, user_lang)

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
