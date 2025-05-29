import os
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.data.processor import DataProcessor
from app.models.hybrid import HybridRecommender
from app.core.logging import logger
from app.core.config import settings
import joblib

def main():
    logger.info("Loading and preprocessing data...")
    processor = DataProcessor()
    processor.load_data()
    user_movie_matrix = processor.get_user_movie_matrix()

    logger.info("Training hybrid recommender...")
    recommender = HybridRecommender(content_weight=settings.CONTENT_WEIGHT, collab_weight=settings.COLLABORATIVE_WEIGHT)
    recommender.fit(
        movies_df=processor.movies_df,
        user_movie_matrix=user_movie_matrix,
        movie_to_idx=processor.movie_to_idx,
        idx_to_movie=processor.idx_to_movie
    )

    # Save model
    settings.SAVED_MODELS_PATH.mkdir(parents=True, exist_ok=True)
    model_path = settings.SAVED_MODELS_PATH / "hybrid_recommender.joblib"
    joblib.dump(recommender, model_path)
    logger.info(f"Model saved to {model_path}")

if __name__ == "__main__":
    main()