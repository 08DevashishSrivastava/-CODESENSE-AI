from backend.app.schemas.diagnostics import Diagnostic
from backend.app.services.voice_service import voice_service

def test_voice_generator_english():
    diag = Diagnostic(
        id="test_1",
        line=8,
        start_column=1,
        end_column=10,
        category="boundary",
        message="Off by one error in loop condition",
        severity="error",
        confidence=0.95,
        source="static",
        voice_text="Warning! Incorrect loop condition on line 8."
    )
    msg = voice_service.generate_message([diag], "en-US")
    assert msg == "Warning! Incorrect loop condition on line 8."

def test_voice_generator_hindi():
    diag = Diagnostic(
        id="test_2",
        line=5,
        start_column=1,
        end_column=5,
        category="syntax",
        message="Missing semicolon",
        severity="error",
        confidence=0.98,
        source="static"
    )
    msg = voice_service.generate_message([diag], "hi-IN")
    assert "लाइन 5 पर सिंटेक्स त्रुटि" in msg
