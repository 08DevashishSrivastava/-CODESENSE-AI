import json
import logging
from typing import List
from ..schemas.diagnostics import Diagnostic, DiagnosticCategory, DiagnosticSeverity
from ..analyzers.base import generate_fingerprint

logger = logging.getLogger(__name__)

class AIResponseValidator:
    @staticmethod
    def validate(raw_json: str, code: str, language: str) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        if not raw_json or not raw_json.strip():
            return diagnostics

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as e:
            logger.warning(f"[CodeSense AI] Failed to parse LLM JSON: {e}")
            return diagnostics

        raw_list = data.get("diagnostics", [])
        if not isinstance(raw_list, list):
            return diagnostics

        total_lines = len(code.split("\n"))

        for item in raw_list:
            if not isinstance(item, dict):
                continue

            try:
                line = int(item.get("line", 1))
                # Validate line is within actual source code range
                if line < 1 or line > total_lines:
                    continue

                message = str(item.get("message", "")).strip()
                if not message:
                    continue

                confidence = float(item.get("confidence", 0.8))
                if confidence < 0.70:
                    continue # Discard low-confidence suggestions

                category = item.get("category", "logic")
                if category not in ["syntax", "type", "logic", "runtime", "boundary", "null_pointer", "infinite_loop", "warning"]:
                    category = "logic"

                severity = item.get("severity", "error")
                if severity not in ["error", "warning", "info"]:
                    severity = "error"

                start_col = max(1, int(item.get("start_column", 1)))
                end_col = max(start_col + 1, int(item.get("end_column", start_col + 10)))

                voice_text = item.get("voice_text")
                if not voice_text:
                    voice_text = f"Warning on line {line}. {message}"

                fp = generate_fingerprint(language, line, category, message)

                diagnostics.append(Diagnostic(
                    id=fp,
                    line=line,
                    start_column=start_col,
                    end_column=end_col,
                    category=category,
                    message=message,
                    severity=severity,
                    confidence=min(1.0, max(0.0, confidence)),
                    source="ai",
                    voice_text=voice_text
                ))
            except Exception as e:
                logger.debug(f"[CodeSense AI] Skipping invalid diagnostic item: {e}")

        return diagnostics

