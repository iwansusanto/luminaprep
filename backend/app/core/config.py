from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "mysql+mysqlconnector://user:password@localhost:3306/luminaprep"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Security
    secret_key: str  # no default — must be set via env
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Application
    app_name: str = "LuminaPrep Backend"
    app_version: str = "0.1.0"
    debug: bool = False  # safe default

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    # File Upload
    upload_dir: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    # Langfuse
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://langprep.luminaprep.my.id"
    langfuse_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore"
    )


settings = Settings()  # type: ignore
