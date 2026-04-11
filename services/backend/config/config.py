import os
from typing import ClassVar

from pydantic_settings import BaseSettings, SettingsConfigDict

# Used to manually switch environments (e.g. to testing)
_environment = os.getenv("ENVIRONMENT")
_env_files = (".env", f".env.{_environment}") if _environment else ".env"


class Settings(BaseSettings):
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=_env_files, extra="ignore"
    )

    ENVIRONMENT: str = "development"

    # Health endpoint
    HEALTH_API_KEY: str

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    FRONTEND_INTERNAL_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()  # pyright: ignore[reportCallIssue]
