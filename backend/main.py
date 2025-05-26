import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import joblib
from app.core.config import settings
from app.core.logging import logger
from app.models.hybrid import HybridRecommender
from app.api.routes.movies import router as movie_router

class RecommendationRequest(BaseModel):
    user_id: int
    n_recommendations: int = 10

class MovieRecommendation(BaseModel):
    movieId: int
    title: str
    genres: str
    final_score: float
    content_score: float
    collab_score: float

app = FastAPI(title=settings.API_TITLE, version=settings.API_VERSION)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include movie API routes
app.include_router(movie_router, prefix="/api/v1", tags=["movies"])

recommender = None

@app.on_event("startup")
def load_model():
    global recommender
    model_path = settings.SAVED_MODELS_PATH / "hybrid_recommender.joblib"
    if not model_path.exists():
        logger.error(f"Model file not found at {model_path}")
        raise RuntimeError(f"Model file not found at {model_path}")
    recommender = joblib.load(model_path)
    logger.info("Model loaded successfully")

@app.get("/")
def root():
    return {"message": "Movie Recommendation API"}

@app.post("/api/v1/recommendations", response_model=List[MovieRecommendation])
def get_recommendations(request: RecommendationRequest):
    if recommender is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    try:
        results = recommender.get_recommendations(
            user_id=request.user_id,
            n_recommendations=request.n_recommendations
        )
        return results
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recommender is not None} 