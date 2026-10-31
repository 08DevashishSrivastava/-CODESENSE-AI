from typing import List
from ..schemas.diagnostics import Diagnostic

class ConfidenceFilter:
    HIGH_CONFIDENCE_THRESHOLD = 0.90
    MEDIUM_CONFIDENCE_THRESHOLD = 0.75
    MINIMUM_VOICE_ALERT_THRESHOLD = 0.75

    @classmethod
    def filter_for_voice(cls, diagnostics: List[Diagnostic]) -> List[Diagnostic]:
        """Returns only diagnostics reliable enough for automatic voice alerts."""
        return [
            d for d in diagnostics 
            if d.confidence >= cls.MINIMUM_VOICE_ALERT_THRESHOLD and d.severity in ("error", "warning")
        ]

    @classmethod
    def categorize_by_confidence(cls, diagnostics: List[Diagnostic]):
        high = [d for d in diagnostics if d.confidence >= cls.HIGH_CONFIDENCE_THRESHOLD]
        medium = [d for d in diagnostics if cls.MEDIUM_CONFIDENCE_THRESHOLD <= d.confidence < cls.HIGH_CONFIDENCE_THRESHOLD]
        low = [d for d in diagnostics if d.confidence < cls.MEDIUM_CONFIDENCE_THRESHOLD]
        return {"high": high, "medium": medium, "low": low}

