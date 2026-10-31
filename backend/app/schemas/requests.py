from typing import Optional, List
from pydantic import BaseModel, Field

class ProblemContext(BaseModel):
    title: Optional[str] = Field("Problem", description="Title of the algorithmic problem")
    description: Optional[str] = Field("", description="Problem description and rules")
    constraints: Optional[str] = Field("", description="Input/output constraints")
    difficulty: Optional[str] = Field(None, description="Problem difficulty if known")

class AnalyzeRequest(BaseModel):
    language: str = Field(..., description="Programming language: java, python, cpp, javascript, c")
    code: str = Field(..., max_length=50000, description="Code source text (up to 50KB)")
    problem_context: Optional[ProblemContext] = Field(default_factory=ProblemContext)
    code_version: int = Field(1, ge=1, description="Client code revision identifier")

class UserSettingsUpdate(BaseModel):
    voice_enabled: Optional[bool] = None
    voice_language: Optional[str] = None
    speech_rate: Optional[float] = Field(None, ge=0.5, le=2.0)
    speech_volume: Optional[float] = Field(None, ge=0.0, le=1.0)
    alert_cooldown: Optional[int] = Field(None, ge=1000, le=15000)
    enabled_languages: Optional[List[str]] = None
    analysis_mode: Optional[str] = None
    save_history: Optional[bool] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None
