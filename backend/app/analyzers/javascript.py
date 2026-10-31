import re
from typing import List
from .base import BaseAnalyzer, generate_fingerprint
from ..schemas.diagnostics import Diagnostic

class JavaScriptAnalyzer(BaseAnalyzer):
    @property
    def language(self) -> str:
        return "javascript"

    def analyze(self, code: str) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        if not code or not code.strip():
            return diagnostics

        lines = code.split("\n")

        # 1. Bracket Matching Stack
        self._check_brackets(lines, diagnostics)

        # 2. Syntax & Common Pitfalls
        self._check_js_patterns(lines, diagnostics)

        return diagnostics

    def _check_brackets(self, lines: List[str], diagnostics: List[Diagnostic]):
        stack = []
        pairs = {"}": "{", ")": "(", "]": "["}
        opens = {"{", "(", "["}
        closes = {"}", ")", "]"}

        for line_idx, line_str in enumerate(lines):
            line_num = line_idx + 1
            in_str = None
            is_esc = False

            for col_idx, ch in enumerate(line_str):
                if not in_str and ch == "/" and col_idx + 1 < len(line_str) and line_str[col_idx + 1] == "/":
                    break

                if not is_esc and ch in ('"', "'", '`'):
                    if in_str == ch:
                        in_str = None
                    elif not in_str:
                        in_str = ch

                if ch == "\\" and not is_esc:
                    is_esc = True
                    continue
                is_esc = False

                if in_str:
                    continue

                if ch in opens:
                    stack.append((ch, line_num, col_idx + 1))
                elif ch in closes:
                    expected = pairs[ch]
                    if not stack:
                        msg = f"Unexpected closing bracket '{ch}' without matching opening bracket."
                        diagnostics.append(Diagnostic(
                            id=generate_fingerprint("javascript", line_num, "syntax", msg),
                            line=line_num,
                            start_column=col_idx + 1,
                            end_column=col_idx + 2,
                            category="syntax",
                            message=msg,
                            severity="error",
                            confidence=0.98,
                            source="static",
                            voice_text=f"Syntax error on line {line_num}. Unexpected closing bracket."
                        ))
                        return
                    else:
                        top_char, top_line, _ = stack.pop()
                        if top_char != expected:
                            msg = f"Mismatched bracket: expected '{top_char}' to match closing '{ch}'."
                            diagnostics.append(Diagnostic(
                                id=generate_fingerprint("javascript", line_num, "syntax", msg),
                                line=line_num,
                                start_column=col_idx + 1,
                                end_column=col_idx + 2,
                                category="syntax",
                                message=msg,
                                severity="error",
                                confidence=0.98,
                                source="static",
                                voice_text=f"Syntax error on line {line_num}. Mismatched bracket detected."
                            ))
                            return

        if stack:
            top_char, top_line, top_col = stack[-1]
            msg = f"Unclosed bracket '{top_char}'. Missing matching closing bracket."
            diagnostics.append(Diagnostic(
                id=generate_fingerprint("javascript", top_line, "syntax", msg),
                line=top_line,
                start_column=top_col,
                end_column=top_col + 1,
                category="syntax",
                message=msg,
                severity="error",
                confidence=0.95,
                source="static",
                voice_text=f"Syntax error on line {top_line}. Missing closing bracket."
            ))

    def _check_js_patterns(self, lines: List[str], diagnostics: List[Diagnostic]):
        for idx, line in enumerate(lines):
            line_num = idx + 1
            trimmed = line.strip()

            # Assignment in if statement: if (x = 5)
            if re.search(r'\bif\s*\([^=)]+=[^=)]+\)', trimmed):
                msg = "Assignment operator '=' used inside condition. Did you mean strict equality '==='?"
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("javascript", line_num, "logic", msg),
                    line=line_num,
                    start_column=line.find("=") + 1,
                    end_column=line.find("=") + 2,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.92,
                    source="static",
                    voice_text=f"Warning on line {line_num}. Assignment operator used in condition."
                ))

            # Array out of bounds in loop: i <= arr.length
            if re.search(r'for\s*\(.*<=\s*\w+\.length', trimmed):
                msg = "Suspicious loop condition '<= arr.length'. Array indexing is 0-based; condition should be '< arr.length'."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("javascript", line_num, "boundary", msg),
                    line=line_num,
                    start_column=1,
                    end_column=len(line) + 1,
                    category="boundary",
                    message=msg,
                    severity="error",
                    confidence=0.91,
                    source="static",
                    voice_text=f"Warning! Possible index out of bounds on line {line_num}."
                ))
