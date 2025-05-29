import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Optional
from ..core.logging import logger
from ..core.config import settings

class MovieIdMapper:
    """Handles mapping between MovieLens and TMDB movie IDs"""
    
    def __init__(self):
        """Initialize the mapper"""
        self.movielens_to_tmdb: Dict[int, int] = {}
        self.tmdb_to_movielens: Dict[int, int] = {}
        
    def load_mappings(self) -> None:
        """Load ID mappings from links.csv file"""
        try:
            logger.info("Loading movie ID mappings...")
            links_df = pd.read_csv(settings.DATASET_PATH / "links.csv")
            
            # Convert IDs to appropriate types and handle NA values
            links_df["movieId"] = links_df["movieId"].astype(int)
            
            # Handle NA values in tmdbId before converting to int
            links_df["tmdbId"] = pd.to_numeric(links_df["tmdbId"], errors='coerce').fillna(-1).astype(int)
            # Filter out rows where tmdbId is -1 (previously NA)
            valid_tmdb_links = links_df[links_df["tmdbId"] != -1]
            
            # Create bidirectional mappings only for valid entries
            self.movielens_to_tmdb = dict(zip(valid_tmdb_links["movieId"], valid_tmdb_links["tmdbId"]))
            self.tmdb_to_movielens = dict(zip(valid_tmdb_links["tmdbId"], valid_tmdb_links["movieId"]))
            
            logger.info(f"Loaded mappings for {len(self.movielens_to_tmdb)} TMDB movies")
            
        except Exception as e:
            logger.error(f"Error loading ID mappings: {str(e)}")
            raise
    
    def get_tmdb_id(self, movielens_id: int) -> Optional[int]:
        """
        Get TMDB ID from MovieLens ID
        Args:
            movielens_id: MovieLens movie ID
        Returns:
            TMDB movie ID or None if not found
        """
        return self.movielens_to_tmdb.get(movielens_id)
    
    def get_movielens_id_from_tmdb(self, tmdb_id: int) -> Optional[int]:
        """
        Get MovieLens ID from TMDB ID
        Args:
            tmdb_id: TMDB movie ID
        Returns:
            MovieLens movie ID or None if not found
        """
        return self.tmdb_to_movielens.get(tmdb_id) 