from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
import numpy as np
import pandas as pd
from app.models.hybrid import HybridRecommender
from ..services.recommendation import get_recommender_model
from ...data.processor import DataProcessor
from ...data.id_mapper import MovieIdMapper
from ..services.tmdb import TMDBService
from app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Initialize services
tmdb_service = TMDBService(api_key=settings.TMDB_API_KEY)
id_mapper = MovieIdMapper()
id_mapper.load_mappings()

@router.get("/user/{user_id}")
def get_user_dashboard(user_id: int, recommender: HybridRecommender = Depends(get_recommender_model)):
    """
    Get user dashboard data with recommendation analysis
    """
    try:
        # Get recommendations with detailed scores
        recommendations = recommender.get_recommendations(user_id, 24)
        
        # Process recommendations to include TMDB IDs
        processed_recommendations = _process_recommendations_with_tmdb_ids(recommendations)
        
        # Analyze favorite genres
        genre_preferences = _analyze_genre_preferences(user_id, recommender)
        
        # Get user factors (latent space representation)
        user_factors = _get_user_factors(user_id, recommender)
        
        # Get similar users
        similar_users = _get_similar_users(user_id, recommender)
        
        # Get content-based keyword analysis
        content_keywords = _analyze_content_keywords(user_id, recommender)
        
        return {
            "recommendations": processed_recommendations,
            "genre_preferences": genre_preferences,
            "user_factors": user_factors,
            "similar_users": similar_users,
            "content_keywords": content_keywords
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

def _analyze_content_keywords(user_id: int, recommender: HybridRecommender) -> Dict[str, float]:
    """Analyze top keywords from content-based model for the user's recommendations"""
    try:
        # Get recommendations
        recs = recommender.get_recommendations(user_id, 10)
        
        # If no recommendations, return empty
        if not recs:
            return {}
        
        # Get TF-IDF feature names if available
        if not hasattr(recommender.content_model, 'vectorizer') or not recommender.content_model.vectorizer:
            return {}
            
        # Get feature names (words) from the vectorizer
        try:
            feature_names = recommender.content_model.vectorizer.get_feature_names_out()
        except:
            # Fallback for older sklearn versions
            feature_names = recommender.content_model.vectorizer.get_feature_names()
        
        # Calculate average importance of each keyword across recommended movies
        keyword_scores = {}
        
        # For each recommended movie
        for rec in recs:
            movie_id = rec['movieId']
            
            # Get the movie's index in the TF-IDF matrix
            if movie_id not in recommender.content_model.movie_to_idx:
                continue
                
            idx = recommender.content_model.movie_to_idx[movie_id]
            
            # Get the movie's TF-IDF vector
            movie_vector = recommender.content_model.tfidf_matrix[idx].toarray()[0]
            
            # Get top keywords for this movie
            top_keyword_indices = movie_vector.argsort()[-20:][::-1]
            
            # Add to the total score for each keyword
            for i in top_keyword_indices:
                if movie_vector[i] > 0:  # Only consider non-zero values
                    keyword = feature_names[i]
                    if keyword.isalpha() and len(keyword) > 2:  # Filter out non-word tokens
                        if keyword not in keyword_scores:
                            keyword_scores[keyword] = 0
                        keyword_scores[keyword] += movie_vector[i]
        
        # Sort by score and take top 15
        sorted_keywords = dict(sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)[:15])
        
        # Normalize scores
        total = sum(sorted_keywords.values())
        if total > 0:
            normalized_keywords = {k: v/total for k, v in sorted_keywords.items()}
            return normalized_keywords
            
        return sorted_keywords
    except Exception as e:
        print(f"Error analyzing content keywords: {e}")
        return {}

def _process_recommendations_with_tmdb_ids(recommendations):
    """
    Process movie recommendations by adding TMDB IDs for frontend compatibility
    
    Args:
        recommendations: List of movie recommendations with MovieLens IDs
        
    Returns:
        List of processed recommendations with TMDB IDs included
    """
    processed_recommendations = []
    
    for rec in recommendations:
        movielens_id = rec["movieId"]
        tmdb_id = id_mapper.get_tmdb_id(movielens_id)
        
        if tmdb_id:
            # Create a copy of the recommendation with TMDB ID added
            processed_rec = rec.copy()
            processed_rec["id"] = tmdb_id  # Add TMDB ID for frontend compatibility
            processed_recommendations.append(processed_rec)
    
    return processed_recommendations
