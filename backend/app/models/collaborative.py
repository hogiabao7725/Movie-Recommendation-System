import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from .base import BaseRecommender
from ..core.logging import logger

class CollaborativeRecommender(BaseRecommender):
    def __init__(self, n_components: int = 100):
        super().__init__()
        self.n_components = n_components
        self.svd = TruncatedSVD(n_components=n_components)
        self.user_factors = None
        self.movie_factors = None
        self.user_ids = None
        self.movie_ids = None
        self.user_idx_map = None
        self.movie_idx_map = None

    def fit(self, user_movie_matrix: pd.DataFrame):
        self.user_ids = user_movie_matrix.index.tolist()
        self.movie_ids = user_movie_matrix.columns.tolist()
        self.user_idx_map = {uid: idx for idx, uid in enumerate(self.user_ids)}
        self.movie_idx_map = {mid: idx for idx, mid in enumerate(self.movie_ids)}
        matrix = user_movie_matrix.values
        self.user_factors = self.svd.fit_transform(matrix)
        self.movie_factors = self.svd.components_.T
        self.is_fitted = True
        logger.info(f"Fitted SVD with {self.n_components} components")

    def get_recommendations(self, user_id: int, n_recommendations: int = 10):
        self._check_is_fitted()
        if user_id not in self.user_idx_map:
            raise ValueError(f"User ID {user_id} not found.")
        user_idx = self.user_idx_map[user_id]
        user_vector = self.user_factors[user_idx]
        scores = np.dot(self.movie_factors, user_vector)
        watched = set(np.where(self.user_factors[user_idx] > 0)[0])
        ranked_indices = np.argsort(scores)[::-1]
        recommendations = []
        count = 0
        for idx in ranked_indices:
            movie_id = self.movie_ids[idx]
            if idx not in watched:
                recommendations.append({
                    'movieId': int(movie_id),
                    'score': float(scores[idx])
                })
                count += 1
            if count >= n_recommendations:
                break
        return recommendations 