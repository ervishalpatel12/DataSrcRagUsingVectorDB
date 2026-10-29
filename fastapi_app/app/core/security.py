"""
Security and authentication dependencies for FastAPI endpoints.
"""
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name=settings.API_KEY_NAME, auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validates incoming request API Key header if authentication is enabled.
    """
    if not settings.ENABLE_AUTH:
        return "unauthenticated-dev-mode"

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "AuthenticationRequired",
                "message": f"Missing required security header: '{settings.API_KEY_NAME}'",
                "code": "MISSING_API_KEY",
            },
        )

    if api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "ForbiddenAccess",
                "message": "Invalid API key provided",
                "code": "INVALID_API_KEY",
            },
        )

    return api_key
