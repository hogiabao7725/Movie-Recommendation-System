from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
import numpy as np
import pandas as pd
from app.models.hybrid import HybridRecommender
from ..services.recommendation import get_recommender_model
from ...data.processor import DataProcessor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/user/{user_id}")
def get_user_dashboard(user_id: int, recommender: HybridRecommender = Depends(get_recommender_model)):
    """
    Get user dashboard data with recommendation analysis
    """
    try:
        # Get recommendations with detailed scores
        recommendations = recommender.get_recommendations(user_id, 24)
        
        # Analyze favorite genres
        genre_preferences = _analyze_genre_preferences(user_id, recommender)
        
        # Get user factors (latent space representation)
        user_factors = _get_user_factors(user_id, recommender)
        
        # Get similar users
        similar_users = _get_similar_users(user_id, recommender)
        
        return {
            "recommendations": recommendations,
            "genre_preferences": genre_preferences,
            "user_factors": user_factors,
            "similar_users": similar_users
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error generating dashboard: {str(e)}")

def _analyze_genre_preferences(user_id: int, recommender: HybridRecommender) -> Dict[str, float]:
    """Analyze user's genre preferences based on recommendations"""
    try:
        # Get all movies rated by the user
        user_idx = recommender.collab_model.user_idx_map.get(user_id)
        if user_idx is None:
            return {}
            
        # Process genres from user's recommendations
        recs = recommender.get_recommendations(user_id, 50)
        all_genres = []
        for rec in recs:
            genres = rec['genres'].split('|')
            all_genres.extend(genres)
            
        # Calculate genre frequency
        genre_counts = {}
        for genre in all_genres:
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
            
        # Normalize to get preferences
        total = sum(genre_counts.values())
        genre_preferences = {genre: count/total for genre, count in genre_counts.items()}
        
        # Sort by preference score
        sorted_preferences = dict(sorted(genre_preferences.items(), 
                                        key=lambda item: item[1], 
                                        reverse=True))
        return sorted_preferences
    except Exception:
        return {}

def _get_user_factors(user_id: int, recommender: HybridRecommender) -> List[float]:
    """Get user's latent factors representation"""
    try:
        user_idx = recommender.collab_model.user_idx_map.get(user_id)
        if user_idx is None:
            return []
        
        # Get user vector from SVD model
        user_vector = recommender.collab_model.user_factors[user_idx].tolist()
        
        # Only return top factors (those with highest absolute values)
        factor_importance = [(i, abs(val)) for i, val in enumerate(user_vector)]
        top_factors = sorted(factor_importance, key=lambda x: x[1], reverse=True)[:10]
        
        return [{"factor": f"Factor {idx}", "value": user_vector[idx]} for idx, _ in top_factors]
    except Exception:
        return []

def _get_similar_users(user_id: int, recommender: HybridRecommender) -> List[int]:
    """Find users with similar taste profiles"""
    try:
        user_idx = recommender.collab_model.user_idx_map.get(user_id)
        if user_idx is None:
            return []
        
        # Get user vector and all other user vectors
        user_vector = recommender.collab_model.user_factors[user_idx]
        all_users = recommender.collab_model.user_factors
        
        # Calculate cosine similarity
        similarities = np.dot(all_users, user_vector) / (
            np.linalg.norm(all_users, axis=1) * np.linalg.norm(user_vector)
        )
        
        # Get top similar users (excluding self)
        similar_indices = np.argsort(similarities)[-6:-1][::-1]
        similar_user_ids = [recommender.collab_model.user_ids[idx] for idx in similar_indices]
        
        return similar_user_ids
    except Exception:
        return []
