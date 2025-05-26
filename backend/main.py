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
from app.api.services.tmdb import TMDBService

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
tmdb_service = TMDBService(api_key=settings.TMDB_API_KEY)

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

@app.post("/api/v1/recommendations")
def get_recommendations(request: RecommendationRequest):
    if recommender is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    try:
        n_needed = request.n_recommendations
        n_fetch = n_needed * 3  # Fetch more to allow for missing/invalid movies
        enriched_results = []
        tried_movie_ids = set()
        while len(enriched_results) < n_needed:
            results = recommender.get_recommendations(
                user_id=request.user_id,
                n_recommendations=n_fetch
            )
            for rec in results:
                movie_id = rec["movieId"]
                if movie_id in tried_movie_ids:
                    continue
                tried_movie_ids.add(movie_id)
                try:
                    movie = tmdb_service.get_movie_details(movie_id)
                    enriched_results.append({
                        "movieId": movie_id,
                        "title": movie["title"],
                        "genres": [genre["name"] for genre in movie["genres"]],
                        "poster_path": tmdb_service.get_poster_url(movie["poster_path"]),
                        "vote_average": movie["vote_average"],
                        "release_date": movie["release_date"],
                        "final_score": rec.get("final_score"),
                        "content_score": rec.get("content_score"),
                        "collab_score": rec.get("collab_score"),
                    })
                    if len(enriched_results) >= n_needed:
                        break
                except Exception as e:
                    logger.error(f"Error fetching details for movie {movie_id}: {str(e)}")
                    continue
            if len(enriched_results) >= n_needed or len(results) == 0:
                break
            # If not enough, increase n_fetch for next round
            n_fetch *= 2
        return enriched_results[:n_needed]
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recommender is not None} 