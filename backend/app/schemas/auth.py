from sqlmodel import SQLModel, Field
from typing import List, Optional


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


class UserSignIn(SQLModel):
    email: str = Field(max_length=255)
    name: str = Field(max_length=255)
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")


class SigninResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserProject(SQLModel):
    id: str
    title: str
    description: Optional[str]


class UserResponse(SQLModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: str
    updated_at: str
    projects: List[UserProject] = []
