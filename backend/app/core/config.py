from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "MacroCoder Agent"
    DEBUG: bool = False
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/macrocoder"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_TOKEN: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Auth
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 10

    # Sentry
    SENTRY_DSN: str = ""


settings = Settings()
