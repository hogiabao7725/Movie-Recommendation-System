import requests
from typing import Dict, List, Optional
from ...core.logging import logger
from ...core.config import settings

class TMDBService:
    """Service for interacting with TheMovieDB API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = settings.TMDB_API_BASE_URL
        self.image_base_url = settings.TMDB_IMAGE_BASE_URL
        self.params = {
            "api_key": api_key
        }
    
    def get_movie_details(self, movie_id: int) -> Dict:
        """Get detailed information about a movie"""
        url = f"{self.base_url}/movie/{movie_id}"
        try:
            response = requests.get(url, params=self.params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching movie details: {str(e)}")
            raise
    
    def search_movies(self, query: str, page: int = 1) -> Dict:
        """Search for movies by title"""
        url = f"{self.base_url}/search/movie"
        params = {
            **self.params,
            "query": query,
            "page": page
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error searching movies: {str(e)}")
            raise
    
    def get_popular_movies(self, page: int = 1) -> Dict:
        """Get list of popular movies"""
        url = f"{self.base_url}/movie/popular"
        params = {
            **self.params,
            "page": page
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching popular movies: {str(e)}")
            raise
    
    def get_movie_credits(self, movie_id: int) -> Dict:
        """Get cast and crew information for a movie"""
        url = f"{self.base_url}/movie/{movie_id}/credits"
        try:
            response = requests.get(url, params=self.params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching movie credits: {str(e)}")
            raise
    
    def get_movie_videos(self, movie_id: int) -> Dict:
        """Get videos (trailers, teasers, etc.) for a movie"""
        url = f"{self.base_url}/movie/{movie_id}/videos"
        try:
            response = requests.get(url, params=self.params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching movie videos: {str(e)}")
            raise
    def get_poster_url(self, poster_path: str, size: str = "w500") -> str:
        """Get full poster URL"""
        if not poster_path:
            return None
        return f"{self.image_base_url}/{size}{poster_path}"
            
    def get_genre_names_from_ids(self, genre_ids: List[int]) -> List[str]:
        """
        Convert genre IDs to genre names using a local mapping
        This avoids making an extra API call for genre information
        """
        # Static mapping of genre IDs to names from TMDB
        # This could be fetched once from TMDB API and cached
        genre_map = {
            28: "Action",
            12: "Adventure",
            16: "Animation",
            35: "Comedy",
            80: "Crime",
            99: "Documentary",
            18: "Drama",
            10751: "Family",
            14: "Fantasy",
            36: "History",
            27: "Horror",
            10402: "Music",
            9648: "Mystery",
            10749: "Romance",
            878: "Science Fiction",
            10770: "TV Movie",
            53: "Thriller",
            10752: "War",
            37: "Western"
        }
        
        return [genre_map.get(genre_id, "Unknown") for genre_id in genre_ids]