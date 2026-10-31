from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
from ..schemas.requests import AnalyzeRequest
from ..schemas.responses import AnalyzeResponse
from ..services.analysis_service import analysis_service
from ..services.usage_service import usage_service
from ..database.supabase import supabase_manager
from ..database.repositories import history_repo, settings_repo

router = APIRouter(prefix="/api/v1", tags=["Analysis"])

SUPPORTED_LANGUAGES = {"java", "python", "py", "cpp", "c++", "c", "javascript", "js"}

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return supabase_manager.verify_token(token)

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code(
    request: AnalyzeRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    if request.language.lower().strip() not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")

    if not request.code or not request.code.strip():
        return AnalyzeResponse(
            success=True,
            code_version=request.code_version,
            diagnostics=[],
            analysis_status="completed",
            voice_message=None,
            processing_time_ms=0
        )

    user_id = user["id"] if user else None
    user_settings = await settings_repo.get_settings(user_id)

    response = await analysis_service.analyze(
        request=request,
        mode="hybrid",
        user_lang=user_settings.get("voice_language", "en-US"),
        personality=user_settings.get("voice_personality", "professional"),
        profanity_enabled=user_settings.get("profanity_enabled", False),
        custom_templates=user_settings.get("custom_voice_templates", {})
    )
    usage_service.record_usage(
        analysis_type="hybrid",
        language=request.language,
        processing_time_ms=response.processing_time_ms,
        user_id=user_id
    )

    # Optional history logging
    if user_id and response.diagnostics:
        for diag in response.diagnostics[:3]:
            await history_repo.save_diagnostic(
                user_id=user_id,
                platform="web",
                language=request.language,
                problem_title=request.problem_context.title if request.problem_context else "",
                error_type=diag.category,
                line_number=diag.line,
                confidence=diag.confidence,
                error_message=diag.message
            )

    return response

@router.post("/analyze/static", response_model=AnalyzeResponse)
async def analyze_code_static(
    request: AnalyzeRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    if request.language.lower().strip() not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    user_id = user["id"] if user else None
    user_settings = await settings_repo.get_settings(user_id)
    response = await analysis_service.analyze(
        request=request,
        mode="static",
        user_lang=user_settings.get("voice_language", "en-US"),
        personality=user_settings.get("voice_personality", "professional"),
        profanity_enabled=user_settings.get("profanity_enabled", False),
        custom_templates=user_settings.get("custom_voice_templates", {})
    )
    usage_service.record_usage("static", request.language, response.processing_time_ms, user_id)
    return response

@router.post("/analyze/ai", response_model=AnalyzeResponse)
async def analyze_code_ai(
    request: AnalyzeRequest,
    user: Optional[dict] = Depends(get_optional_user)
):
    if request.language.lower().strip() not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    user_id = user["id"] if user else None
    user_settings = await settings_repo.get_settings(user_id)
    response = await analysis_service.analyze(
        request=request,
        mode="ai",
        user_lang=user_settings.get("voice_language", "en-US"),
        personality=user_settings.get("voice_personality", "professional"),
        profanity_enabled=user_settings.get("profanity_enabled", False),
        custom_templates=user_settings.get("custom_voice_templates", {})
    )
    user_id = user["id"] if user else None
    usage_service.record_usage("ai", request.language, response.processing_time_ms, user_id)
    return response
