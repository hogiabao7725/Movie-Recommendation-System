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
from app.api.routes.dashboard import router as dashboard_router
from app.api.services.tmdb import TMDBService
from app.data.id_mapper import MovieIdMapper

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

# Include API routes
app.include_router(movie_router, prefix="/api/v1", tags=["movies"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["dashboard"])

recommender = None
tmdb_service = TMDBService(api_key=settings.TMDB_API_KEY)
id_mapper = MovieIdMapper()

@app.on_event("startup")
def load_model():
    global recommender
    model_path = settings.SAVED_MODELS_PATH / "hybrid_recommender.joblib"
    if not model_path.exists():
        logger.error(f"Model file not found at {model_path}")
        raise RuntimeError(f"Model file not found at {model_path}")
    recommender = joblib.load(model_path)
    logger.info("Model loaded successfully")
    
    # Load ID mappings
    id_mapper.load_mappings()
    logger.info("ID mappings loaded successfully")

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
                
            movielens_id = rec["movieId"]
            if movielens_id in tried_movie_ids:
                continue
                
            tried_movie_ids.add(movielens_id)
            
            try:
                # Convert MovieLens ID to TMDB ID
                tmdb_id = id_mapper.get_tmdb_id(movielens_id)
                if tmdb_id is None:
                    logger.warning(f"No TMDB ID mapping found for MovieLens ID {movielens_id}")
                    continue
                
                # Get movie details from TMDB
                movie = tmdb_service.get_movie_details(tmdb_id)
                
                # Create standardized movie object with recommendation scores
                enriched_results.append({
                    "id": tmdb_id,  # Use TMDB ID for consistency with Movie object from movies API
                    "title": movie["title"],
                    "genres": [genre["name"] for genre in movie["genres"]],
                    "poster_path": tmdb_service.get_poster_url(movie["poster_path"]),
                    "vote_average": movie["vote_average"],
                    "release_date": movie["release_date"],
                    "overview": movie["overview"],
                    # Include recommendation scores
                    "final_score": rec.get("final_score"),
                    "content_score": rec.get("content_score"),
                    "collab_score": rec.get("collab_score"),
                    # Add weights for frontend display
                    "content_weight": getattr(recommender, "content_weight", 0.5),
                    "collab_weight": getattr(recommender, "collab_weight", 0.5),
                })
            except Exception as e:
                logger.error(f"Error fetching details for movie {movielens_id}: {str(e)}")
                continue
                
        # Return exactly the requested number of recommendations
        return enriched_results[:needed_count]
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": recommender is not None} 