from typing import List, Optional
from ..schemas.requests import ProblemContext
from ..schemas.diagnostics import Diagnostic

SYSTEM_PROMPT = """You are CodeSense AI, a real-time, precision coding error detection engine.
Your sole mission is to identify definitive logical errors, boundary bugs, infinite loops, and severe semantic mistakes in competitive programming and interview solutions.

CRITICAL PRODUCT RULES:
1. NEVER flag formatting, naming conventions, style choices, or minor micro-optimizations.
2. Only report clear mistakes that will produce incorrect results, Runtime Errors, or Time Limit Exceeded (e.g. wrong loop boundary, off-by-one array access, wrong variable referenced, inverted comparison operator, missing base case in recursion).
3. Every reported diagnostic MUST correspond to a specific, existing line of code.
4. Keep the 'voice_text' natural, punchy, and under 15 words for browser speech synthesis (e.g. "Warning! Incorrect loop condition on line 8.", "Possible array index out of bounds on line 12.").
5. You MUST respond with valid JSON matching the exact schema below.

OUTPUT JSON SCHEMA:
{
  "diagnostics": [
    {
      "line": 8,
      "start_column": 1,
      "end_column": 20,
      "category": "boundary",
      "message": "Loop condition '<= nums.length' causes ArrayIndexOutOfBoundsException.",
      "severity": "error",
      "confidence": 0.95,
      "voice_text": "Warning! Possible array index out of bounds on line 8."
    }
  ]
}
If no logical error is found, return: { "diagnostics": [] }
"""

def build_user_prompt(
    language: str,
    code: str,
    problem_context: Optional[ProblemContext],
    static_diagnostics: List[Diagnostic]
) -> str:
    lines = code.split("\n")
    numbered_code = "\n".join(f"{i + 1:3d} | {line}" for i, line in enumerate(lines))

    prompt = f"PROGRAMMING LANGUAGE: {language}\n\n"

    if problem_context:
        prompt += f"PROBLEM TITLE: {problem_context.title or 'Unknown'}\n"
        if problem_context.description:
            prompt += f"PROBLEM DESCRIPTION:\n{problem_context.description[:1500]}\n\n"
        if problem_context.constraints:
            prompt += f"CONSTRAINTS:\n{problem_context.constraints[:500]}\n\n"

    if static_diagnostics:
        prompt += "KNOWN SYNTAX / STATIC ISSUES DETECTED:\n"
        for d in static_diagnostics[:5]:
            prompt += f"- Line {d.line}: {d.message}\n"
        prompt += "\n"

    prompt += f"USER SOURCE CODE:\n```\n{numbered_code}\n```\n\n"
    prompt += "Analyze the code and output the JSON diagnostics object."
    return prompt

