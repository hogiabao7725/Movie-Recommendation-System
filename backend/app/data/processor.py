import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Optional
from ..core.logging import logger
from ..core.config import settings

class DataProcessor:
    """Data loading and preprocessing class"""
    
    def __init__(self):
        """Initialize the data processor"""
        self.movies_df: Optional[pd.DataFrame] = None
        self.ratings_df: Optional[pd.DataFrame] = None
        self.tags_df: Optional[pd.DataFrame] = None
        self.movie_to_idx: Dict[int, int] = {}
        self.idx_to_movie: Dict[int, int] = {}
        
    def load_data(self) -> None:
        """Load and preprocess the dataset"""
        try:
            # Load movies
            logger.info("Loading movies dataset...")
            self.movies_df = pd.read_csv(settings.DATASET_PATH / "movies.csv")
            self.movies_df["movieId"] = self.movies_df["movieId"].astype(int)
            
            # Load ratings
            logger.info("Loading ratings dataset...")
            self.ratings_df = pd.read_csv(settings.DATASET_PATH / "ratings.csv")
            self.ratings_df["movieId"] = self.ratings_df["movieId"].astype(int)
            self.ratings_df["userId"] = self.ratings_df["userId"].astype(int)
            
            # Load tags if available
            try:
                logger.info("Loading tags dataset...")
                self.tags_df = pd.read_csv(settings.DATASET_PATH / "tags.csv")
                self.tags_df["movieId"] = self.tags_df["movieId"].astype(int)
                self.tags_df["userId"] = self.tags_df["userId"].astype(int)
            except FileNotFoundError:
                logger.warning("Tags file not found, continuing without tags")
                self.tags_df = None
            
            # Create movie mappings
            self._create_movie_mappings()
            
            # Log dataset statistics
            self._log_dataset_stats()
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def _create_movie_mappings(self) -> None:
        """Create movie ID to index mappings"""
        # Get all unique movie IDs
        all_movies = sorted(self.movies_df["movieId"].unique())
        
        # Create mappings
        self.movie_to_idx = {movie_id: idx for idx, movie_id in enumerate(all_movies)}
        self.idx_to_movie = {idx: movie_id for idx, movie_id in enumerate(all_movies)}
        
        logger.info(f"Created movie mappings for {len(self.movie_to_idx)} movies")
    
    def _log_dataset_stats(self) -> None:
        """Log dataset statistics"""
        logger.info(f"Movies dataset: {len(self.movies_df)} movies")
        logger.info(f"Ratings dataset: {len(self.ratings_df)} ratings")
        logger.info(f"Number of unique users: {self.ratings_df['userId'].nunique()}")
        logger.info(f"Number of unique movies with ratings: {self.ratings_df['movieId'].nunique()}")
        if self.tags_df is not None:
            logger.info(f"Tags dataset: {len(self.tags_df)} tags")
    
    def get_user_movie_matrix(self) -> pd.DataFrame:
        """
        Create user-movie rating matrix
        Returns:
            DataFrame with user-movie ratings
        """
        if self.ratings_df is None:
            raise ValueError("Ratings data not loaded")
            
        # Create pivot table
        user_movie_matrix = self.ratings_df.pivot(
            index="userId",
            columns="movieId",
            values="rating"
        ).fillna(0)
        
        logger.info(f"Created user-movie matrix with shape: {user_movie_matrix.shape}")
        return user_movie_matrix
    
    def get_movie_index(self, movie_id: int) -> int:
        """
        Get movie index from movie ID
        Args:
            movie_id: Movie ID
        Returns:
            Movie index
        """
        return self.movie_to_idx[movie_id]
    
    def get_movie_id(self, movie_idx: int) -> int:
        """
        Get movie ID from movie index
        Args:
            movie_idx: Movie index
        Returns:
            Movie ID
        """
        return self.idx_to_movie[movie_idx] 