from typing import Dict, List
from .base import BaseAnalyzer
from .java import JavaAnalyzer
from .python import PythonAnalyzer
from .cpp import CppAnalyzer
from .javascript import JavaScriptAnalyzer
from ..schemas.diagnostics import Diagnostic

class StaticAnalysisEngine:
    def __init__(self):
        self._analyzers: Dict[str, BaseAnalyzer] = {
            "java": JavaAnalyzer(),
            "python": PythonAnalyzer(),
            "py": PythonAnalyzer(),
            "cpp": CppAnalyzer(is_c=False),
            "c++": CppAnalyzer(is_c=False),
            "c": CppAnalyzer(is_c=True),
            "javascript": JavaScriptAnalyzer(),
            "js": JavaScriptAnalyzer()
        }

    def analyze(self, code: str, language: str) -> List[Diagnostic]:
        lang_key = language.lower().strip()
        analyzer = self._analyzers.get(lang_key)
        if not analyzer:
            # Fallback to python or c-style depending on basic structure
            if "{" in code and ";" in code:
                analyzer = self._analyzers["cpp"]
            else:
                analyzer = self._analyzers["python"]

        return analyzer.analyze(code)

static_engine = StaticAnalysisEngine()
