from typing import List, Optional
from pydantic import BaseModel
from .diagnostics import Diagnostic

class AnalyzeResponse(BaseModel):
    success: bool
    code_version: int
    diagnostics: List[Diagnostic]
    analysis_status: str
    voice_message: Optional[str] = None
    processing_time_ms: int

class HealthResponse(BaseModel):
    status: str
    version: str
    ai_available: bool
    supabase_available: bool

class AuthResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    detail: Optional[str] = None

class UsageRecord(BaseModel):
    id: str
    analysis_type: str
    language: str
    processing_time_ms: int
    created_at: str

class UsageResponse(BaseModel):
    total_analyses: int
    records: List[UsageRecord]
