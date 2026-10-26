import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend or root directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SmartQMS — E-Commerce Quality Management Suite")
    TAGLINE: str = os.getenv("TAGLINE", "Software Quality. Verified at Every Stage.")
    PRODUCT_DESCRIPTION: str = "Enterprise software quality management platform for development teams. Manages requirements, reviews, testing, defects, quality metrics, releases, and corrective actions."
    VERSION: str = "2.4.0"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smartqms_enterprise_production_jwt_secret_key_2026_secure")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours
    WORKSPACE_MODE: str = os.getenv("WORKSPACE_MODE", "standard")  # "standard" (with baseline data) or "clean"
    
    # SQLite Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_qms.db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
