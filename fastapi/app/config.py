from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/travel_guide"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    openai_api_key: str = ""
    google_client_id: str = ""
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://travel-guide.pages.dev",
    ]
    cors_origin_regex: str = r"(http://localhost(:\d+)?)|(https://[\w-]+\.trycloudflare\.com)|(https://[\w-]+\.pages\.dev)"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
