from fastapi import APIRouter, HTTPException
from ..schemas.requests import LoginRequest, SignUpRequest
from ..schemas.responses import AuthResponse
from ..database.supabase import supabase_manager

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignUpRequest):
    if not supabase_manager.is_available:
        return AuthResponse(
            success=False,
            detail="Supabase is not configured on the backend. Please use Guest Mode."
        )

    try:
        res = supabase_manager.client.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        if res.user:
            token = res.session.access_token if res.session else None
            return AuthResponse(
                success=True,
                access_token=token,
                user_id=str(res.user.id),
                email=str(res.user.email),
                detail="User account created successfully."
            )
        else:
            return AuthResponse(success=False, detail="Failed to create user.")
    except Exception as e:
        return AuthResponse(success=False, detail=str(e))

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    if not supabase_manager.is_available:
        return AuthResponse(
            success=False,
            detail="Supabase is not configured on the backend. Please use Guest Mode."
        )

    try:
        res = supabase_manager.client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        if res.session and res.user:
            return AuthResponse(
                success=True,
                access_token=res.session.access_token,
                refresh_token=res.session.refresh_token,
                user_id=str(res.user.id),
                email=str(res.user.email),
                detail="Signed in successfully."
            )
        return AuthResponse(success=False, detail="Invalid credentials.")
    except Exception as e:
        return AuthResponse(success=False, detail=str(e))

@router.post("/logout")
async def logout():
    return {"success": True, "message": "Signed out successfully."}
