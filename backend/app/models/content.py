import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .base import BaseRecommender
from ..core.logging import logger

class ContentBasedRecommender(BaseRecommender):
    def __init__(self, max_features: int = 5000):
        super().__init__()
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=max_features)
        self.tfidf_matrix = None
        self.movies_df = None
        self.movie_to_idx = None
        self.idx_to_movie = None

    def fit(self, movies_df: pd.DataFrame, movie_to_idx: dict, idx_to_movie: dict):
        self.movies_df = movies_df.copy()
        self.movie_to_idx = movie_to_idx
        self.idx_to_movie = idx_to_movie
        # Combine title and genres for content
        self.movies_df['content'] = self.movies_df['title'] + ' ' + self.movies_df['genres']
        self.tfidf_matrix = self.vectorizer.fit_transform(self.movies_df['content'])
        self.is_fitted = True
        logger.info(f"Created TF-IDF matrix with shape: {self.tfidf_matrix.shape}")

    def get_recommendations(self, movie_id: int, n_recommendations: int = 10):
        self._check_is_fitted()
        if movie_id not in self.movie_to_idx:
            raise ValueError(f"Movie ID {movie_id} not found in mapping.")
        idx = self.movie_to_idx[movie_id]
        cosine_sim = cosine_similarity(self.tfidf_matrix[idx], self.tfidf_matrix).flatten()
        similar_indices = cosine_sim.argsort()[-n_recommendations-1:-1][::-1]
        results = []
        for i in similar_indices:
            results.append({
                'movieId': int(self.movies_df.iloc[i]['movieId']),
                'title': self.movies_df.iloc[i]['title'],
                'genres': self.movies_df.iloc[i]['genres'],
                'score': float(cosine_sim[i])
            })
        return results 