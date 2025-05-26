from .base import BaseRecommender
from .content import ContentBasedRecommender
from .collaborative import CollaborativeRecommender
from ..core.logging import logger

class HybridRecommender(BaseRecommender):
    def __init__(self, content_weight: float = 0.5, collab_weight: float = 0.5):
        super().__init__()
        self.content_weight = content_weight
        self.collab_weight = collab_weight
        self.content_model = ContentBasedRecommender()
        self.collab_model = CollaborativeRecommender()
        self.movies_df = None
        self.movie_to_idx = None
        self.idx_to_movie = None

    def fit(self, movies_df, user_movie_matrix, movie_to_idx, idx_to_movie):
        self.movies_df = movies_df
        self.movie_to_idx = movie_to_idx
        self.idx_to_movie = idx_to_movie
        self.content_model.fit(movies_df, movie_to_idx, idx_to_movie)
        self.collab_model.fit(user_movie_matrix)
        self.is_fitted = True
        logger.info("Hybrid model training completed")

    def get_recommendations(self, user_id: int, n_recommendations: int = 10):
        self._check_is_fitted()
        # Get collaborative recommendations
        collab_recs = self.collab_model.get_recommendations(user_id, n_recommendations * 2)
        # For each recommended movie, get content score
        results = []
        for rec in collab_recs:
            movie_id = rec['movieId']
            collab_score = rec['score']
            try:
                content_score = self.content_model.get_recommendations(movie_id, 1)[0]['score']
            except Exception:
                content_score = 0.0
            final_score = self.content_weight * content_score + self.collab_weight * collab_score
            movie_row = self.movies_df[self.movies_df['movieId'] == movie_id].iloc[0]
            results.append({
                'movieId': int(movie_id),
                'title': movie_row['title'],
                'genres': movie_row['genres'],
                'final_score': final_score,
                'content_score': content_score,
                'collab_score': collab_score
            })
        # Sort by final score
        results = sorted(results, key=lambda x: x['final_score'], reverse=True)
        return results[:n_recommendations] 