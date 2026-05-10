from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class UserBase(SQLModel):
    email: str = Field(index=True, unique=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None, sa_column_kwargs={"comment": "User avatar URL"})


class User(UserBase, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    projects: List["Project"] = Relationship(back_populates="user")
    materials: List["Material"] = Relationship(back_populates="user")
    user_attempts: List["UserAttempt"] = Relationship(back_populates="user")


class UserCreate(SQLModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8)
    full_name: Optional[str] = Field(default=None, max_length=255)


class UserSignIn(SQLModel):
    email: str = Field(max_length=255)
    name: str = Field(max_length=255)
    avatar_url: Optional[str] = Field(default=None, description="User avatar URL")


class UserRead(SQLModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    updated_at: datetime


class UserLogin(SQLModel):
    email: str = Field(max_length=255)
    password: str
