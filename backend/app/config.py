import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "CodeSense AI Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "https://leetcode.com",
        "https://*.leetcode.com",
        "https://geeksforgeeks.org",
        "https://*.geeksforgeeks.org",
        "https://hackerrank.com",
        "https://*.hackerrank.com",
        "https://codechef.com",
        "https://*.codechef.com",
        "https://codeforces.com",
        "chrome-extension://*",
        "http://localhost:5173",
        "http://localhost:3000",
        "*"
    ]

    # AI Configuration (OpenAI-compatible abstraction)
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_TIMEOUT_SECONDS: float = 8.0

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
