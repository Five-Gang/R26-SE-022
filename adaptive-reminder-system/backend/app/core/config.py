from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str
    MONGODB_DB: str = "reminder_db"

    # Auth
    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 1440

    # App
    ENV: str = "dev"
    EMOTION_PROVIDER: str = "http"      # http | replay | mock (offline tests only)
    REPLAY_CSV: str = "app/artifacts/daisee_embeddings.csv"
    EMOTION_SERVICE_URL: str = ""       # Mihiraj's URL — fill in at integration

    # Push
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CONTACT_EMAIL: str = ""

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8001",
        "file://*"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
