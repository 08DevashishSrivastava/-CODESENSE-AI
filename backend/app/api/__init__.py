from .health import router as health_router
from .analyze import router as analyze_router
from .auth import router as auth_router
from .settings import router as settings_router
from .usage import router as usage_router
from .diagnostics import router as diagnostics_router

__all__ = [
    "health_router",
    "analyze_router",
    "auth_router",
    "settings_router",
    "usage_router",
    "diagnostics_router"
]
