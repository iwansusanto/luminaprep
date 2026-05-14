# Google OAuth is now handled by the frontend
# This file is kept for reference but is no longer used

def get_google_auth_url():
    """Generate Google OAuth authorization URL (deprecated - handled by FE)."""
    raise NotImplementedError("Google OAuth is now handled by the frontend")

async def verify_google_token(code: str):
    """Verify Google OAuth code and get user info (deprecated - handled by FE)."""
    raise NotImplementedError("Google OAuth is now handled by the frontend")
