from typing import List, Optional
from ..schemas.diagnostics import Diagnostic

class VoiceMessageGenerator:
    @staticmethod
    def generate_message(diagnostics: List[Diagnostic], lang_code: str = "en-US") -> Optional[str]:
        if not diagnostics:
            return None

        # Pick the highest confidence error first
        actionable = [d for d in diagnostics if d.confidence >= 0.75]
        if not actionable:
            return None

        top_error = sorted(actionable, key=lambda d: (0 if d.severity == 'error' else 1, -d.confidence))[0]

        if lang_code.startswith("hi"):
            # Hindi translation support for primary warnings
            if top_error.category == "boundary":
                return f"चेतावनी! लाइन {top_error.line} पर लूप की सीमा की जांच करें।"
            elif top_error.category == "syntax":
                return f"लाइन {top_error.line} पर सिंटेक्स त्रुटि पाई गई।"
            else:
                return f"लाइन {top_error.line} पर त्रुटि: {top_error.message[:40]}"

        # English
        if top_error.voice_text:
            return top_error.voice_text

        if top_error.category == "boundary":
            return f"Warning! Incorrect loop boundary on line {top_error.line}."
        elif top_error.category == "syntax":
            return f"Syntax error detected on line {top_error.line}."
        elif top_error.category == "infinite_loop":
            return f"Possible infinite loop detected on line {top_error.line}."

        return f"Warning on line {top_error.line}. {top_error.message}"

voice_service = VoiceMessageGenerator()
