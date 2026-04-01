import httpx
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/login")
async def login():
    """Redirect to GitHub OAuth."""
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "repo,user:email",
        "state": "macrocoder",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{query}")


@router.get("/callback")
async def callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """Handle GitHub OAuth callback, return JWT to frontend."""
    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(400, f"GitHub OAuth failed: {token_data}")

        # Fetch user info
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        github_user = user_resp.json()

    # Generate a simple JWT-like token containing the GitHub access token
    import uuid
    from datetime import datetime, timezone, timedelta
    from jose import jwt
    user_id = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "github_token": access_token, "username": github_user.get("login")}
    jwt_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    # Redirect to frontend with token
    return RedirectResponse(f"{settings.FRONTEND_URL}/?token={jwt_token}")
