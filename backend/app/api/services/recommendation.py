import joblib
from pathlib import Path
from app.core.config import settings
from app.models.hybrid import HybridRecommender

def get_recommender_model() -> HybridRecommender:
    """
    Load and return the trained recommender model
    """
    model_path = settings.SAVED_MODELS_PATH / "hybrid_recommender.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found at {model_path}")
    
    recommender = joblib.load(model_path)
    return recommender
