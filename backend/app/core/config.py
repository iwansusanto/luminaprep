from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    database_url: str = Field(default="mysql+mysqlconnector://user:password@localhost:3306/luminaprep")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379")
    
    # Security
    secret_key: str = Field(default="your-secret-key-change-in-production")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    
    # Google OAuth
    google_client_id: str = Field(default="your-google-client-id.apps.googleusercontent.com")
    google_client_secret: str = Field(default="your-google-client-secret")
    google_redirect_uri: str = Field(default="http://localhost:8004/api/v1/auth/google/callback")
    
    # Application
    app_name: str = Field(default="LuminaPrep Backend")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    
    # CORS
    allowed_origins: list[str] = Field(default=["http://localhost:3000", "http://localhost:5173"])
    
    # File Upload
    upload_dir: str = Field(default="uploads")
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
