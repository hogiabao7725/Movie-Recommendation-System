from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings"""    # Project paths
    PROJECT_ROOT: Path = Path(__file__).parent.parent.parent
    BASE_DIR: Path = Path(__file__).parent.parent.parent.parent
    DATASET_PATH: Path = BASE_DIR / "dataset"
    SAVED_MODELS_PATH: Path = PROJECT_ROOT / "saved_models"
    LOGS_PATH: Path = PROJECT_ROOT / "logs"
    
    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    API_TITLE: str = "Movie Recommendation API"
    API_VERSION: str = "1.0.0"
    
    # Model settings
    CONTENT_WEIGHT: float = 0.5
    COLLABORATIVE_WEIGHT: float = 0.5
    SVD_N_COMPONENTS: int = 100
    TFIDF_MAX_FEATURES: int = 5000
    
    # TMDB API settings
    TMDB_API_KEY: str
    TMDB_API_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p"
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings() 