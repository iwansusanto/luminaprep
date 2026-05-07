"""
Google OAuth 2.0 Configuration and Helper Functions
"""

from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, status
from app.core.config import settings
from typing import Optional
import secrets

# Google OAuth 2.0 Configuration
oauth = OAuth()
google_oauth = oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

def get_google_auth_url() -> str:
    """Generate Google OAuth authorization URL."""
    redirect_uri = settings.google_redirect_uri
    state = secrets.token_urlsafe(16)  # Generate random state for CSRF protection
    
    # Build authorization URL manually
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={redirect_uri}&"
        "response_type=code&"
        "scope=openid email profile&"
        f"state={state}"
    )
    
    return auth_url

def verify_google_token(code: str) -> Optional[dict]:
    """Verify and decode Google OAuth token using authorization code."""
    try:
        # Exchange authorization code for access token
        import requests
        
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'code': code,
            'client_id': settings.google_client_id,
            'client_secret': settings.google_client_secret,
            'redirect_uri': settings.google_redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        token_data = response.json()
        
        # Get user info with access token
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {'Authorization': f"Bearer {token_data['access_token']}"}
        
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        
        return user_response.json()
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
