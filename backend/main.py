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
    limit: int = 10  # Renamed for consistency with other API endpoints

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
    """
    Get personalized movie recommendations for a user
    
    Args:
        request: RecommendationRequest with user_id and limit
        
    Returns:
        List of recommended movies with details
    """
    if recommender is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Use a simple cache to avoid recalculating frequently requested recommendations
    cache_key = f"recommendations_{request.user_id}_{request.limit}"
    
    # Check if we have cached results (would be implemented with Redis in production)
    # For now, we'll just proceed with generating recommendations
    
    try:
        needed_count = request.limit
        fetch_count = needed_count * 2  # Fetch more to allow for missing/invalid movies
        
        # Get recommendations from the model
        results = recommender.get_recommendations(
            user_id=request.user_id,
            n_recommendations=fetch_count
        )
        
        # Process results and get movie details
        enriched_results = []
        tried_movie_ids = set()
        
        for rec in results:
            # Skip if we already have enough recommendations
            if len(enriched_results) >= needed_count:
                break
                
            movie_id = rec["movieId"]
            if movie_id in tried_movie_ids:
                continue
                
            tried_movie_ids.add(movie_id)
            
            try:
                # Get movie details from TMDB
                movie = tmdb_service.get_movie_details(movie_id)
                
                # Create standardized movie object with recommendation scores
                enriched_results.append({
                    "id": movie_id,  # Make consistent with Movie object from movies API
                    "title": movie["title"],
                    "genres": [genre["name"] for genre in movie["genres"]],
                    "poster_path": tmdb_service.get_poster_url(movie["poster_path"]),
                    "vote_average": movie["vote_average"],
                    "release_date": movie["release_date"],
                    "overview": movie["overview"],
                    # Include recommendation scores
                    "final_score": rec.get("final_score"),
                    "content_score": rec.get("content_score"),
                    "collab_score": rec.get("collab_score"),                })
            except Exception as e:
                logger.error(f"Error fetching details for movie {movie_id}: {str(e)}")
                continue
                
        # Return exactly the requested number of recommendations
        return enriched_results[:needed_count]
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recommender is not None} 