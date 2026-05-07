from sqlmodel import SQLModel, Field
from typing import Optional


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(SQLModel):
    email: Optional[str] = None


class GoogleAuthUrl(SQLModel):
    authorization_url: str


class GoogleAuthCallback(SQLModel):
    code: str
    state: str


class UserResponse(SQLModel):
    id: str
    email: str
    full_name: Optional[str]
    created_at: str
    updated_at: str
