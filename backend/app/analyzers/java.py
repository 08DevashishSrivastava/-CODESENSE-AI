import re
import os
import subprocess
import tempfile
from typing import List
from .base import BaseAnalyzer, generate_fingerprint
from ..schemas.diagnostics import Diagnostic

class JavaAnalyzer(BaseAnalyzer):
    @property
    def language(self) -> str:
        return "java"

    def analyze(self, code: str) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        if not code or not code.strip():
            return diagnostics

        lines = code.split("\n")

        # 1. Bracket Matching Stack
        self._check_brackets(lines, diagnostics)

        # 2. Syntax & Semicolon Checking
        self._check_semicolons_and_statements(lines, diagnostics)

        # 3. Common Java Logical & Boundary Bugs
        self._check_java_patterns(lines, diagnostics)

        # 4. Optional Fast Compiler Diagnostics via javac if available
        javac_diags = self._try_javac_compile(code)
        if javac_diags:
            # Merge with high priority
            existing_lines = {d.line for d in diagnostics}
            for jd in javac_diags:
                if jd.line not in existing_lines:
                    diagnostics.append(jd)

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
                # Skip comments
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
                        msg = f"Unexpected closing bracket '{ch}' with no matching opening bracket."
                        diagnostics.append(Diagnostic(
                            id=generate_fingerprint("java", line_num, "syntax", msg),
                            line=line_num,
                            start_column=col_idx + 1,
                            end_column=col_idx + 2,
                            category="syntax",
                            message=msg,
                            severity="error",
                            confidence=0.99,
                            source="static",
                            voice_text=f"Syntax error on line {line_num}. Unexpected closing bracket."
                        ))
                        return
                    else:
                        top_char, top_line, _ = stack.pop()
                        if top_char != expected:
                            msg = f"Mismatched bracket: expected '{top_char}' to match closing '{ch}'."
                            diagnostics.append(Diagnostic(
                                id=generate_fingerprint("java", line_num, "syntax", msg),
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
            unclosed_char, unclosed_line, unclosed_col = stack[-1]
            msg = f"Unclosed bracket '{unclosed_char}'. Missing matching closing bracket."
            diagnostics.append(Diagnostic(
                id=generate_fingerprint("java", unclosed_line, "syntax", msg),
                line=unclosed_line,
                start_column=unclosed_col,
                end_column=unclosed_col + 1,
                category="syntax",
                message=msg,
                severity="error",
                confidence=0.95,
                source="static",
                voice_text=f"Syntax warning on line {unclosed_line}. Missing closing bracket."
            ))

    def _check_semicolons_and_statements(self, lines: List[str], diagnostics: List[Diagnostic]):
        for idx, line in enumerate(lines):
            line_num = idx + 1
            trimmed = line.strip()

            if not trimmed or trimmed.startswith("//") or trimmed.startswith("/*") or trimmed.startswith("*"):
                continue

            # Skip control structures & class/method headers
            if any(trimmed.startswith(kw) for kw in ["for", "if", "while", "else", "try", "catch", "class", "interface", "public class"]):
                continue

            if trimmed.endswith("{") or trimmed.endswith("}") or trimmed.endswith(";") or trimmed.endswith(":"):
                continue

            # Look ahead for multiline statements
            if idx + 1 < len(lines):
                next_trimmed = lines[idx + 1].strip()
                if any(next_trimmed.startswith(op) for op in ["+", "-", "*", "/", ".", "&&", "||", "?", ":"]):
                    continue

            # Candidate statements missing semicolon
            if (trimmed.startswith("return") or "=" in trimmed or trimmed.startswith("throw") or 
                re.match(r'^[a-zA-Z0-9_<>[\]]+\s+[a-zA-Z0-9_]+', trimmed)):
                msg = "Missing semicolon ';' at the end of statement."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("java", line_num, "syntax", msg),
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

    def _check_java_patterns(self, lines: List[str], diagnostics: List[Diagnostic]):
        for idx, line in enumerate(lines):
            line_num = idx + 1
            trimmed = line.strip()

            # Array index out of bounds: `<= arr.length`
            if trimmed.startswith("for") and ".length" in trimmed and "<=" in trimmed:
                msg = "Suspicious loop boundary '<= arr.length'. Risk of ArrayIndexOutOfBoundsException; should typically be '< arr.length'."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("java", line_num, "boundary", msg),
                    line=line_num,
                    start_column=1,
                    end_column=len(line) + 1,
                    category="boundary",
                    message=msg,
                    severity="error",
                    confidence=0.92,
                    source="static",
                    voice_text=f"Warning! Possible array index out of bounds on line {line_num}. Check loop boundary."
                ))

            # String comparison with ==
            if re.search(r'\b[a-zA-Z_]\w*\s*==\s*"[^"]*"', trimmed) or re.search(r'"[^"]*"\s*==\s*\b[a-zA-Z_]\w*', trimmed):
                msg = "String comparison using '=='. In Java, compare strings using '.equals()' instead of reference equality '=='."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("java", line_num, "logic", msg),
                    line=line_num,
                    start_column=1,
                    end_column=len(line) + 1,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.90,
                    source="static",
                    voice_text=f"Warning on line {line_num}. String comparison should use dot equals."
                ))

    def _try_javac_compile(self, code: str) -> List[Diagnostic]:
        javac_path = r"C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.3\jbr\bin\javac.exe"
        if not os.path.exists(javac_path):
            return []

        # If code doesn't define class, wrap in dummy class to test compilation
        has_class = "class " in code
        wrapped_code = code if has_class else f"public class Solution {{\n{code}\n}}"
        offset = 0 if has_class else 1

        diagnostics: List[Diagnostic] = []
        try:
            with tempfile.NamedTemporaryFile(suffix=".java", mode="w", delete=False) as f:
                f.write(wrapped_code)
                temp_filename = f.name

            try:
                proc = subprocess.run(
                    [javac_path, "-Xlint:none", temp_filename],
                    capture_output=True,
                    text=True,
                    timeout=2.0
                )
                if proc.stderr:
                    for match in re.finditer(r':(\d+):\s*error:\s*(.*)', proc.stderr):
                        line_in_file = int(match.group(1)) - offset
                        err_text = match.group(2).strip()
                        if line_in_file >= 1:
                            diagnostics.append(Diagnostic(
                                id=generate_fingerprint("java", line_in_file, "syntax", err_text),
                                line=line_in_file,
                                start_column=1,
                                end_column=20,
                                category="syntax",
                                message=f"Java compiler error: {err_text}",
                                severity="error",
                                confidence=0.99,
                                source="static",
                                voice_text=f"Java syntax error on line {line_in_file}. {err_text}"
                            ))
            finally:
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
        except Exception:
            pass

        return diagnostics
