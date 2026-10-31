import re
from abc import ABC, abstractmethod
from typing import List
from ..schemas.diagnostics import Diagnostic, DiagnosticCategory, DiagnosticSeverity

def generate_fingerprint(language: str, line: int, category: str, message: str) -> str:
    normalized = re.sub(r'\s+', ' ', message.lower()).strip()[:100]
    raw = f"{language.lower()}:{line}:{category.lower()}:{normalized}"
    h = 5381
    for char in raw:
        h = (((h << 5) + h) + ord(char)) & 0xFFFFFFFF
    return f"cs_diag_{hex(h)[2:]}"

class BaseAnalyzer(ABC):
    @property
    @abstractmethod
    def language(self) -> str:
        pass

    @abstractmethod
    def analyze(self, code: str) -> List[Diagnostic]:
        pass
