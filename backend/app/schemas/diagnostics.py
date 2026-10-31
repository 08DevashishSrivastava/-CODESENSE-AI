from typing import Literal, Optional
from pydantic import BaseModel, Field

DiagnosticSeverity = Literal["error", "warning", "info"]
DiagnosticCategory = Literal[
    "syntax", 
    "type", 
    "logic", 
    "runtime", 
    "boundary", 
    "null_pointer", 
    "infinite_loop", 
    "warning"
]
DiagnosticSource = Literal["local", "static", "ai"]

class Diagnostic(BaseModel):
    id: str = Field(..., description="Deterministic diagnostic fingerprint")
    line: int = Field(..., ge=1, description="1-based line number")
    start_column: int = Field(1, ge=1, description="1-based start column")
    end_column: int = Field(1, ge=1, description="1-based end column")
    category: DiagnosticCategory = Field("syntax", description="Error category")
    message: str = Field(..., description="Clear human-readable error description")
    severity: DiagnosticSeverity = Field("error", description="Severity level")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    source: DiagnosticSource = Field("static", description="Source of detection")
    voice_text: Optional[str] = Field(None, description="Natural sentence for TTS")
    code_snippet: Optional[str] = Field(None, description="Problematic line or tokens")
