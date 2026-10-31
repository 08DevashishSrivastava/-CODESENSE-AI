import re
from typing import List
from .base import BaseAnalyzer, generate_fingerprint
from ..schemas.diagnostics import Diagnostic

class CppAnalyzer(BaseAnalyzer):
    def __init__(self, is_c: bool = False):
        self._is_c = is_c

    @property
    def language(self) -> str:
        return "c" if self._is_c else "cpp"

    def analyze(self, code: str) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        if not code or not code.strip():
            return diagnostics

        lines = code.split("\n")
        lang_name = self.language

        # 1. Bracket Matching Stack
        self._check_brackets(lines, lang_name, diagnostics)

        # 2. Semicolons & Syntax
        self._check_semicolons(lines, lang_name, diagnostics)

        # 3. C/C++ specific idioms & bugs
        self._check_cpp_patterns(lines, lang_name, diagnostics)

        return diagnostics

    def _check_brackets(self, lines: List[str], lang: str, diagnostics: List[Diagnostic]):
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

                if not is_esc and ch in ('"', "'"):
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
                            id=generate_fingerprint(lang, line_num, "syntax", msg),
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
                                id=generate_fingerprint(lang, line_num, "syntax", msg),
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
                id=generate_fingerprint(lang, top_line, "syntax", msg),
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

    def _check_semicolons(self, lines: List[str], lang: str, diagnostics: List[Diagnostic]):
        for idx, line in enumerate(lines):
            line_num = idx + 1
            trimmed = line.strip()

            if not trimmed or trimmed.startswith("//") or trimmed.startswith("#") or trimmed.startswith("/*"):
                continue

            if any(trimmed.startswith(kw) for kw in ["for", "if", "while", "else", "switch", "case", "template"]):
                continue

            # Class/struct definition end must have semicolon: `};`
            if trimmed == "}" and idx > 0:
                # check if preceding block was struct or class
                prev_text = "\n".join(lines[max(0, idx - 20):idx])
                if re.search(r'\b(class|struct)\s+[a-zA-Z_]\w*', prev_text):
                    msg = "Missing semicolon ';' after class or struct definition."
                    diagnostics.append(Diagnostic(
                        id=generate_fingerprint(lang, line_num, "syntax", msg),
                        line=line_num,
                        start_column=len(line),
                        end_column=len(line) + 1,
                        category="syntax",
                        message=msg,
                        severity="error",
                        confidence=0.94,
                        source="static",
                        voice_text=f"Missing semicolon after struct or class definition on line {line_num}."
                    ))

            if trimmed.endswith("{") or trimmed.endswith("}") or trimmed.endswith(";") or trimmed.endswith(":"):
                continue

            if idx + 1 < len(lines):
                next_trimmed = lines[idx + 1].strip()
                if any(next_trimmed.startswith(op) for op in ["+", "-", "*", "/", "->", ".", "&&", "||"]):
                    continue

            if (trimmed.startswith("return") or "=" in trimmed or 
                re.match(r'^[a-zA-Z0-9_<>[\]*&]+\s+[a-zA-Z0-9_]+', trimmed)):
                msg = "Missing semicolon ';' at the end of statement."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint(lang, line_num, "syntax", msg),
                    line=line_num,
                    start_column=len(line),
                    end_column=len(line) + 1,
                    category="syntax",
                    message=msg,
                    severity="error",
                    confidence=0.97,
                    source="static",
                    voice_text=f"Missing semicolon on line {line_num}."
                ))

    def _check_cpp_patterns(self, lines: List[str], lang: str, diagnostics: List[Diagnostic]):
        for idx, line in enumerate(lines):
            line_num = idx + 1
            trimmed = line.strip()

            # Assignment in if statement: if (x = 0)
            if re.search(r'\bif\s*\([^=)]+=[^=)]+\)', trimmed):
                msg = "Assignment operator '=' used inside 'if' conditional statement. Did you mean '=='?"
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint(lang, line_num, "logic", msg),
                    line=line_num,
                    start_column=line.find("=") + 1,
                    end_column=line.find("=") + 2,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.92,
                    source="static",
                    voice_text=f"Warning on line {line_num}. Assignment operator used inside condition."
                ))

            # Loop boundary out of bounds: i <= arr.size()
            if re.search(r'for\s*\(.*<=\s*\w+\.size\(\)', trimmed):
                msg = "Suspicious loop boundary '<= arr.size()'. Possible off-by-one index out of bounds; use '< arr.size()'."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint(lang, line_num, "boundary", msg),
                    line=line_num,
                    start_column=1,
                    end_column=len(line) + 1,
                    category="boundary",
                    message=msg,
                    severity="error",
                    confidence=0.91,
                    source="static",
                    voice_text=f"Warning! Incorrect loop boundary on line {line_num}."
                ))

