from typing import List, Optional, Dict
from ..schemas.diagnostics import Diagnostic

class VoiceMessageGenerator:
    @staticmethod
    def generate_message(
        diagnostics: List[Diagnostic],
        lang_code: str = "en-US",
        personality: str = "professional",
        profanity_enabled: bool = False,
        custom_templates: Optional[Dict[str, str]] = None
    ) -> Optional[str]:
        if not diagnostics:
            return None

        # Pick highest confidence error
        actionable = [d for d in diagnostics if d.confidence >= 0.75]
        if not actionable:
            return None

        top_error = sorted(actionable, key=lambda d: (0 if d.severity == 'error' else 1, -d.confidence))[0]
        cat = top_error.category
        line = top_error.line

        # User custom override template
        if custom_templates and cat in custom_templates:
            return custom_templates[cat].replace("{line}", str(line)).replace("{message}", top_error.message)

        if personality == "friendly":
            if cat == "boundary":
                return f"Bhai, yahan loop condition check kar lo line {line} pe. Kuch galat lag raha hai."
            elif cat == "syntax":
                if "bracket" in top_error.message.lower():
                    return f"Bhai, bracket band karna bhool gaya line {line} pe!"
                return f"Bhai, line {line} pe semicolon ya syntax miss ho gaya."
            elif cat == "logic":
                if "return" in top_error.message.lower():
                    return f"Bhai kya kar raha hai? Ye return statement galat hai line {line} pe!"
                return f"Bhai, line {line} pe logic check kar lo. Kuch galat lag raha hai."
            elif cat == "infinite_loop":
                return f"Bhai dhyan do, infinite loop ban sakta hai line {line} pe."
            elif cat == "type":
                return f"Kya code likh raha hai bhai? Ye variable declare hi nahi kiya line {line} pe!"
            return f"Bhai, line {line} pe check kar lo."

        elif personality == "roast":
            if profanity_enabled:
                if cat == "boundary":
                    return f"Oye laude, array ki length se bahar mat ja! Line {line} check kar!"
                elif cat == "syntax":
                    if "bracket" in top_error.message.lower():
                        return f"Abe laude, bracket band karna bhool gaya kya line {line} pe?"
                    return f"Abe laude, ye line {line} galat likh di! Semicolon bhool gaya kya?"
                elif cat == "logic":
                    if "return" in top_error.message.lower():
                        return f"Abe laude, kya code likh raha hai? Ye return statement galat hai!"
                    return f"Abe laude, ye line {line} galat likh di! Loop condition check kar!"
                elif cat == "infinite_loop":
                    return f"Oye laude, infinite loop bana diya kya? Line {line} dekh!"
                elif cat == "type":
                    return f"Abe laude, variable declare kiya nahi aur use karne lag gaya line {line} pe?"
                return f"Abe laude, ye line {line} galat likh di!"
            else:
                # Clean / Sanskari Desi Roast
                if cat == "boundary":
                    return f"Abe, i <= n kyu likha? i < n hona chahiye! Line {line} check kar!"
                elif cat == "syntax":
                    if "bracket" in top_error.message.lower():
                        return f"Abe, bracket band karna bhool gaya line {line} pe!"
                    return f"Oye coder, line {line} pe syntax galat likh diya!"
                elif cat == "logic":
                    if "return" in top_error.message.lower():
                        return f"Bhai kya kar raha hai? Ye return statement galat hai!"
                    return f"Abe bhai, ye line {line} galat likh di! Loop condition check kar!"
                elif cat == "infinite_loop":
                    return f"Oye coder, infinite loop bana diya kya?"
                elif cat == "type":
                    return f"Kya code likh raha hai bhai? Ye variable declare hi nahi kiya!"
                return f"Kya code likh raha hai bhai? Line {line} pe error hai!"

        # Default: Professional Mode
        if lang_code.startswith("hi"):
            if cat == "boundary":
                return f"चेतावनी! लाइन {line} पर लूप की सीमा की जांच करें।"
            elif cat == "syntax":
                return f"लाइन {line} पर सिंटेक्स त्रुटि पाई गई।"
            else:
                return f"लाइन {line} पर त्रुटि: {top_error.message[:40]}"

        if top_error.voice_text:
            return top_error.voice_text

        if cat == "boundary":
            return f"Warning! Incorrect loop condition detected on line {line}."
        elif cat == "syntax":
            return f"Syntax error detected on line {line}."
        elif cat == "infinite_loop":
            return f"Possible infinite loop detected on line {line}."

        return f"Warning on line {line}. {top_error.message}"

voice_service = VoiceMessageGenerator()
