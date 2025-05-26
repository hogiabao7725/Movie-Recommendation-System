import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix, save_npz, load_npz
from sklearn.decomposition import TruncatedSVD
import pickle
import os
from typing import List, Dict, Optional, Tuple
import logging

class HybridRecommender:
    def __init__(self, dataset_path: str):
        """
        Initialize the Hybrid Recommender System
        Args:
            dataset_path: Path to the dataset directory
        """
        self.dataset_path = dataset_path
        self.ratings_df = None
        self.movies_df = None
        self.tags_df = None
        self.user_movie_matrix = None
        self.content_similarity_matrix = None
        self.svd_model = None
        self.tfidf_matrix = None
        self.vectorizer = None
        self.movie_to_idx = None
        self.idx_to_movie = None
        
    def load_data(self):
        """Load and preprocess the dataset"""
        # Load ratings
        self.ratings_df = pd.read_csv(os.path.join(self.dataset_path, 'ratings.csv'))
        
        # Load movies
        self.movies_df = pd.read_csv(os.path.join(self.dataset_path, 'movies.csv'))
        
        # Create movie index mappings for faster lookups
        self.movie_to_idx = {movie_id: idx for idx, movie_id in enumerate(self.movies_df['movieId'])}
        self.idx_to_movie = {idx: movie_id for idx, movie_id in enumerate(self.movies_df['movieId'])}
        
        # Load tags if available
        try:
            self.tags_df = pd.read_csv(os.path.join(self.dataset_path, 'tags.csv'))
            # Combine tags with movie data
            movie_tags = self.tags_df.groupby('movieId')['tag'].apply(lambda x: ' '.join(x)).reset_index()
            self.movies_df = self.movies_df.merge(movie_tags, on='movieId', how='left')
            self.movies_df['tag'] = self.movies_df['tag'].fillna('')
        except:
            logging.warning("Tags file not found, continuing without tags")
            
        # Create user-movie rating matrix
        self.user_movie_matrix = self.ratings_df.pivot(
            index='userId',
            columns='movieId',
            values='rating'
        ).fillna(0)
        
    def train_content_based_model(self):
        """Train the content-based filtering model"""
        # Combine movie titles, genres, and tags
        self.movies_df['content'] = self.movies_df['title'] + ' ' + self.movies_df['genres']
        if 'tag' in self.movies_df.columns:
            self.movies_df['content'] += ' ' + self.movies_df['tag']
        
        # Create TF-IDF matrix with optimized parameters
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=5000,
            ngram_range=(1, 2)
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.movies_df['content'])
        
        # Calculate content similarity matrix
        self.content_similarity_matrix = cosine_similarity(self.tfidf_matrix)
        
    def train_collaborative_model(self, n_components: int = 100):
        """Train the collaborative filtering model using SVD"""
        # Convert to sparse matrix
        sparse_matrix = csr_matrix(self.user_movie_matrix.values)
        
        # Apply SVD with optimized parameters
        self.svd_model = TruncatedSVD(
            n_components=n_components,
            algorithm='randomized',
            n_iter=10
        )
        self.svd_model.fit(sparse_matrix)
        
    def get_content_based_recommendations(self, movie_id: int, n_recommendations: int = 5) -> pd.DataFrame:
        """Get content-based recommendations for a movie"""
        try:
            # Get the index of the movie
            movie_idx = self.movie_to_idx[movie_id]
            
            # Get similarity scores
            similarity_scores = list(enumerate(self.content_similarity_matrix[movie_idx]))
            similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
            similarity_scores = similarity_scores[1:n_recommendations+1]
            
            # Get movie indices and scores
            movie_indices = [i[0] for i in similarity_scores]
            scores = [i[1] for i in similarity_scores]
            
            # Get movie details
            recommendations = self.movies_df.iloc[movie_indices][['movieId', 'title', 'genres']].copy()
            recommendations['similarity_score'] = scores
            
            return recommendations
        except KeyError:
            logging.error(f"Movie ID {movie_id} not found in the dataset")
            return pd.DataFrame()
    
    def get_collaborative_recommendations(self, user_id: int, n_recommendations: int = 5) -> pd.DataFrame:
        """Get collaborative filtering recommendations for a user"""
        try:
            # Get user's ratings
            user_ratings = self.user_movie_matrix.loc[user_id]
            
            # Get movies the user hasn't rated
            unwatched_movies = user_ratings[user_ratings == 0].index
            
            # Transform user ratings
            user_ratings_sparse = csr_matrix(user_ratings.values.reshape(1, -1))
            user_features = self.svd_model.transform(user_ratings_sparse)
            
            # Calculate predicted ratings for all unwatched movies at once
            movie_indices = [self.movie_to_idx[movie_id] for movie_id in unwatched_movies]
            movie_features = self.svd_model.components_[:, movie_indices]
            predicted_ratings = np.dot(user_features, movie_features)[0]
            
            # Create recommendations DataFrame
            recommendations = pd.DataFrame({
                'movieId': unwatched_movies,
                'predicted_rating': predicted_ratings
            })
            
            # Sort and get top recommendations
            recommendations = recommendations.sort_values('predicted_rating', ascending=False)
            recommendations = recommendations.head(n_recommendations)
            
            # Add movie details
            recommendations = recommendations.merge(
                self.movies_df[['movieId', 'title', 'genres']],
                on='movieId'
            )
            
            return recommendations
        except KeyError:
            logging.error(f"User ID {user_id} not found in the dataset")
            return pd.DataFrame()
    
    def get_hybrid_recommendations(
        self,
        user_id: int,
        movie_id: Optional[int] = None,
        n_recommendations: int = 5,
        content_weight: float = 0.3,
        collab_weight: float = 0.7
    ) -> pd.DataFrame:
        """
        Get hybrid recommendations combining content-based and collaborative filtering
        Args:
            user_id: User ID to get recommendations for
            movie_id: Optional movie ID to base content-based recommendations on
            n_recommendations: Number of recommendations to return
            content_weight: Weight for content-based recommendations (0-1)
            collab_weight: Weight for collaborative recommendations (0-1)
        """
        # Get collaborative recommendations
        collab_recommendations = self.get_collaborative_recommendations(
            user_id,
            n_recommendations=n_recommendations * 2  # Get more recommendations for better combination
        )
        
        if movie_id:
            # Get content-based recommendations
            content_recommendations = self.get_content_based_recommendations(
                movie_id,
                n_recommendations=n_recommendations * 2
            )
            
            # Normalize scores
            if not collab_recommendations.empty:
                collab_recommendations['predicted_rating'] = (
                    collab_recommendations['predicted_rating'] - collab_recommendations['predicted_rating'].min()
                ) / (collab_recommendations['predicted_rating'].max() - collab_recommendations['predicted_rating'].min())
            
            if not content_recommendations.empty:
                content_recommendations['similarity_score'] = (
                    content_recommendations['similarity_score'] - content_recommendations['similarity_score'].min()
                ) / (content_recommendations['similarity_score'].max() - content_recommendations['similarity_score'].min())
            
            # Combine recommendations
            combined_recommendations = pd.concat([
                collab_recommendations[['movieId', 'title', 'genres', 'predicted_rating']],
                content_recommendations[['movieId', 'title', 'genres', 'similarity_score']]
            ])
            
            # Calculate hybrid score
            combined_recommendations['hybrid_score'] = (
                collab_weight * combined_recommendations['predicted_rating'].fillna(0) +
                content_weight * combined_recommendations['similarity_score'].fillna(0)
            )
            
            # Remove duplicates and sort by hybrid score
            combined_recommendations = combined_recommendations.drop_duplicates(subset=['movieId'])
            combined_recommendations = combined_recommendations.sort_values('hybrid_score', ascending=False)
            
            return combined_recommendations[['movieId', 'title', 'genres']].head(n_recommendations)
        
        return collab_recommendations[['movieId', 'title', 'genres']].head(n_recommendations)
    
    def save_model(self, model_path: str):
        """Save the trained models"""
        # Create model directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        # Save sparse matrices separately
        if self.tfidf_matrix is not None:
            save_npz(f"{model_path}.tfidf", self.tfidf_matrix)
        if self.content_similarity_matrix is not None:
            save_npz(f"{model_path}.similarity", csr_matrix(self.content_similarity_matrix))
        
        # Save other model components
        model_data = {
            'svd_model': self.svd_model,
            'vectorizer': self.vectorizer,
            'movies_df': self.movies_df,
            'user_movie_matrix': self.user_movie_matrix,
            'movie_to_idx': self.movie_to_idx,
            'idx_to_movie': self.idx_to_movie
        }
        
        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, model_path: str):
        """Load the trained models"""
        # Load sparse matrices
        if os.path.exists(f"{model_path}.tfidf"):
            self.tfidf_matrix = load_npz(f"{model_path}.tfidf")
        if os.path.exists(f"{model_path}.similarity"):
            self.content_similarity_matrix = load_npz(f"{model_path}.similarity").toarray()
        
        # Load other model components
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            
        self.svd_model = model_data['svd_model']
        self.vectorizer = model_data['vectorizer']
        self.movies_df = model_data['movies_df']
        self.user_movie_matrix = model_data['user_movie_matrix']
        self.movie_to_idx = model_data['movie_to_idx']
        self.idx_to_movie = model_data['idx_to_movie'] 