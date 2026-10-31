import ast
import re
from typing import List, Set
from .base import BaseAnalyzer, generate_fingerprint
from ..schemas.diagnostics import Diagnostic

class PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, code: str):
        self.code = code
        self.diagnostics: List[Diagnostic] = []
        self.defined_names: Set[str] = set()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        # Check mutable default arguments
        for default in node.args.defaults:
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                msg = f"Dangerous default mutable value in function '{node.name}'. Use 'None' as default instead."
                self.diagnostics.append(Diagnostic(
                    id=generate_fingerprint("python", default.lineno, "logic", msg),
                    line=default.lineno,
                    start_column=default.col_offset + 1,
                    end_column=getattr(default, "end_col_offset", default.col_offset + 5) + 1,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.94,
                    source="static",
                    voice_text=f"Warning on line {default.lineno}. Mutable default argument detected."
                ))

        # Check unreachable code after return / raise
        for i, stmt in enumerate(node.body[:-1]):
            if isinstance(stmt, (ast.Return, ast.Raise)):
                unreachable = node.body[i + 1]
                msg = f"Unreachable code detected after '{type(stmt).__name__.lower()}' statement."
                self.diagnostics.append(Diagnostic(
                    id=generate_fingerprint("python", unreachable.lineno, "logic", msg),
                    line=unreachable.lineno,
                    start_column=unreachable.col_offset + 1,
                    end_column=getattr(unreachable, "end_col_offset", unreachable.col_offset + 10) + 1,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.92,
                    source="static",
                    voice_text=f"Warning on line {unreachable.lineno}. Unreachable code detected."
                ))
                break

        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare):
        # Check `is` with literal integer/string/float
        for op, comparator in zip(node.ops, node.comparators):
            if isinstance(op, (ast.Is, ast.IsNot)) and isinstance(comparator, ast.Constant) and not isinstance(comparator.value, (bool, type(None))):
                msg = f"Comparison using '{type(op).__name__.lower()}' with a literal constant. Use '==' or '!=' instead."
                self.diagnostics.append(Diagnostic(
                    id=generate_fingerprint("python", node.lineno, "logic", msg),
                    line=node.lineno,
                    start_column=node.col_offset + 1,
                    end_column=getattr(node, "end_col_offset", node.col_offset + 15) + 1,
                    category="logic",
                    message=msg,
                    severity="warning",
                    confidence=0.91,
                    source="static",
                    voice_text=f"Warning on line {node.lineno}. Identity comparison used with literal."
                ))

            # Check `== None` instead of `is None`
            if isinstance(op, ast.Eq) and isinstance(comparator, ast.Constant) and comparator.value is None:
                msg = "Comparison with 'None' should use 'is None' rather than '== None'."
                self.diagnostics.append(Diagnostic(
                    id=generate_fingerprint("python", node.lineno, "logic", msg),
                    line=node.lineno,
                    start_column=node.col_offset + 1,
                    end_column=getattr(node, "end_col_offset", node.col_offset + 10) + 1,
                    category="logic",
                    message=msg,
                    severity="info",
                    confidence=0.88,
                    source="static",
                    voice_text=f"Suggestion on line {node.lineno}. Prefer 'is None' comparison."
                ))

        self.generic_visit(node)

class PythonAnalyzer(BaseAnalyzer):
    @property
    def language(self) -> str:
        return "python"

    def analyze(self, code: str) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        if not code or not code.strip():
            return diagnostics

        # 1. Native AST Syntax Validation
        try:
            tree = ast.parse(code)
            # AST parsed successfully, now perform semantic linting
            visitor = PythonASTVisitor(code)
            visitor.visit(tree)
            diagnostics.extend(visitor.diagnostics)

        except SyntaxError as e:
            line_num = e.lineno or 1
            col_offset = e.offset or 1
            err_msg = e.msg or "Syntax error"
            
            # Format friendly message
            friendly_msg = f"Python SyntaxError: {err_msg}"
            voice_phrase = f"Syntax error on line {line_num}. {err_msg}."

            diagnostics.append(Diagnostic(
                id=generate_fingerprint("python", line_num, "syntax", err_msg),
                line=line_num,
                start_column=col_offset,
                end_column=col_offset + 1,
                category="syntax",
                message=friendly_msg,
                severity="error",
                confidence=0.99,
                source="static",
                voice_text=voice_phrase
            ))

        # 2. Line-based checks for common logical bugs
        self._check_python_patterns(code, diagnostics)

        return diagnostics

    def _check_python_patterns(self, code: str, diagnostics: List[Diagnostic]):
        lines = code.split("\n")
        for i, line in enumerate(lines):
            line_num = i + 1
            trimmed = line.strip()

            # Off-by-one: range(len(arr) + 1)
            if re.search(r'range\(\s*len\([^)]+\)\s*\+\s*1\s*\)', trimmed):
                msg = "Possible IndexError: 'range(len(...) + 1)' will exceed list bounds on the final iteration."
                diagnostics.append(Diagnostic(
                    id=generate_fingerprint("python", line_num, "boundary", msg),
                    line=line_num,
                    start_column=1,
                    end_column=len(line) + 1,
                    category="boundary",
                    message=msg,
                    severity="error",
                    confidence=0.93,
                    source="static",
                    voice_text=f"Warning! Possible index out of bounds on line {line_num} in range loop."
                ))

