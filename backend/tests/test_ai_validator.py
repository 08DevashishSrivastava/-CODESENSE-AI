from backend.app.ai.validator import AIResponseValidator

def test_ai_validator_valid_json():
    raw_json = """
    {
        "diagnostics": [
            {
                "line": 3,
                "start_column": 5,
                "end_column": 15,
                "category": "boundary",
                "message": "Off-by-one boundary error in loop condition",
                "severity": "error",
                "confidence": 0.95,
                "voice_text": "Warning! Incorrect loop condition on line 3."
            }
        ]
    }
    """
    code = "line1\nline2\nline3\nline4"
    diags = AIResponseValidator.validate(raw_json, code, "python")
    assert len(diags) == 1
    assert diags[0].line == 3
    assert diags[0].category == "boundary"
    assert diags[0].confidence == 0.95
    assert diags[0].source == "ai"
    assert "line 3" in diags[0].voice_text

def test_ai_validator_out_of_bounds_line_discarded():
    raw_json = """
    {
        "diagnostics": [
            {
                "line": 999,
                "message": "Imaginary line error",
                "confidence": 0.99
            }
        ]
    }
    """
    code = "line1\nline2"
    diags = AIResponseValidator.validate(raw_json, code, "python")
    assert len(diags) == 0, "Errors on non-existent lines must be filtered out"

def test_ai_validator_low_confidence_discarded():
    raw_json = """
    {
        "diagnostics": [
            {
                "line": 1,
                "message": "Maybe change variable name",
                "confidence": 0.50
            }
        ]
    }
    """
    code = "x = 1"
    diags = AIResponseValidator.validate(raw_json, code, "python")
    assert len(diags) == 0, "Low confidence diagnostics must be discarded"
