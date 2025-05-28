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

    def get_recommendations(self, user_id: int, n_recommendations: int = 24):
        self._check_is_fitted()
        # Get collaborative recommendations (fetch a large number to ensure enough candidates)
        collab_recs = self.collab_model.get_recommendations(user_id, 500)
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
        # Sort by final score (always sort full list)
        results = sorted(results, key=lambda x: x['final_score'], reverse=True)
        # Normalize content_score and collab_score
        if results:
            content_scores = [r['content_score'] for r in results]
            collab_scores = [r['collab_score'] for r in results]
            min_content, max_content = min(content_scores), max(content_scores)
            min_collab, max_collab = min(collab_scores), max(collab_scores)
            for r in results:
                if max_content > min_content:
                    r['content_score'] = (r['content_score'] - min_content) / (max_content - min_content)
                else:
                    r['content_score'] = 0.0
                if max_collab > min_collab:
                    r['collab_score'] = (r['collab_score'] - min_collab) / (max_collab - min_collab)
                else:
                    r['collab_score'] = 0.0
            # Normalize final_score
            final_scores = [r['final_score'] for r in results]
            min_final, max_final = min(final_scores), max(final_scores)
            for r in results:
                if max_final > min_final:
                    r['final_score'] = (r['final_score'] - min_final) / (max_final - min_final)
                else:
                    r['final_score'] = 0.0
        # Only apply limit at the end
        return results[:n_recommendations] 