from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Callable
from pydantic import BaseModel
from functools import lru_cache
import time
from ..services.tmdb import TMDBService
from ...core.config import settings
from ...core.logging import logger

# Initialize router and TMDB service
router = APIRouter()
tmdb_service = TMDBService(api_key=settings.TMDB_API_KEY)

# Simple in-memory cache with TTL
cache = {}
cache_ttl = {}
CACHE_DURATION = 300  # 5 minutes cache

# Data models for API responses
class Movie(BaseModel):
    id: int
    title: str
    overview: str
    poster_path: Optional[str]
    release_date: Optional[str]
    vote_average: float
    genres: List[str]

class CastMember(BaseModel):
    id: int
    name: str
    character: str
    profile_path: Optional[str]

class CrewMember(BaseModel):
    id: int
    name: str
    job: str
    department: str
    profile_path: Optional[str]

class MovieCredits(BaseModel):
    cast: List[CastMember]
    crew: List[CrewMember]

class Video(BaseModel):
    id: str
    key: str
    name: str
    site: str
    type: str

# Helper functions
def get_cached_data(key: str, fetch_func: Callable, ttl: int = CACHE_DURATION):
    """
    Get data from cache or fetch it if not available or expired
    
    Args:
        key: Cache key
        fetch_func: Function to call if cache miss
        ttl: Time to live in seconds
        
    Returns:
        Cached or freshly fetched data
    """
    current_time = time.time()
    
    # Return from cache if available and not expired
    if key in cache and current_time < cache_ttl.get(key, 0):
        logger.info(f"Cache hit for {key}")
        return cache[key]
    
    # Fetch fresh data
    logger.info(f"Cache miss for {key}, fetching fresh data")
    data = fetch_func()
    
    # Store in cache with expiration
    cache[key] = data
    cache_ttl[key] = current_time + ttl
    
    return data

def process_movie_data(movie: Dict) -> Movie:
    """
    Convert raw TMDB movie data to our Movie model
    
    Args:
        movie: Raw movie data from TMDB
        
    Returns:
        Processed Movie object
    """
    # Extract genres based on whether we have genre_ids or genres
    genres = []
    if "genre_ids" in movie and movie["genre_ids"]:
        genres = tmdb_service.get_genre_names_from_ids(movie["genre_ids"])
    elif "genres" in movie:
        genres = [genre["name"] for genre in movie["genres"]]
    
    # Create Movie object with standardized data
    return Movie(
        id=movie["id"],
        title=movie["title"],
        overview=movie["overview"],
        poster_path=tmdb_service.get_poster_url(movie["poster_path"]),
        release_date=movie.get("release_date"),  # Use get() for optional fields
        vote_average=movie["vote_average"],
        genres=genres
    )

@router.get("/movies/popular", response_model=List[Movie])
async def get_popular_movies(page: int = Query(1, ge=1), limit: int = Query(None, description="Limit the number of results")):
    """
    Get list of popular movies from TMDB with optimized performance
    
    Args:
        page: Page number for pagination
        limit: Optional limit for number of movies to return
        
    Returns:
        List of popular movies
    """
    try:
        # Create a unique cache key based on parameters
        cache_key = f"popular_movies_page{page}_limit{limit}"
        
        # Define function to fetch data if cache miss
        def fetch_data():
            return tmdb_service.get_popular_movies(page=page)
        
        # Get data from cache or fetch it
        response = get_cached_data(cache_key, fetch_data)
        
        # Apply optional limit
        results = response["results"]
        if limit:
            results = results[:limit]
        
        # Process all movies at once and return
        return [process_movie_data(movie) for movie in results]
    
    except Exception as e:
        logger.error(f"Error fetching popular movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/search", response_model=List[Movie])
async def search_movies(query: str, page: int = Query(1, ge=1), limit: int = Query(None, description="Limit the number of results")):
    """
    Search movies by title
    
    Args:
        query: Search term
        page: Page number for pagination
        limit: Optional limit for number of movies to return
        
    Returns:
        List of movies matching the search
    """
    try:
        # Create a unique cache key based on parameters
        cache_key = f"search_movies_query{query}_page{page}_limit{limit}"
        
        # Define function to fetch data if cache miss
        def fetch_data():
            return tmdb_service.search_movies(query=query, page=page)
        
        # Get data from cache or fetch it
        response = get_cached_data(cache_key, fetch_data)
        
        # Apply optional limit
        results = response["results"]
        if limit:
            results = results[:limit]
            
        # Process movies without individual API calls
        # Use genre_ids instead of fetching details for each movie
        return [process_movie_data(movie) for movie in results]
        
    except Exception as e:
        logger.error(f"Error searching movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}", response_model=Movie)
async def get_movie_details(movie_id: int):
    """
    Get detailed information about a movie
    
    Args:
        movie_id: TMDB movie ID
        
    Returns:
        Detailed movie information
    """
    try:
        # Create cache key for this movie
        cache_key = f"movie_details_{movie_id}"
        
        # Define function to fetch data if cache miss
        def fetch_data():
            return tmdb_service.get_movie_details(movie_id)
        
        # Get data from cache or fetch it
        movie = get_cached_data(cache_key, fetch_data)
        
        # Process and return movie data
        return process_movie_data(movie)
        
    except Exception as e:
        logger.error(f"Error fetching movie details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}/credits", response_model=MovieCredits)
async def get_movie_credits(movie_id: int):
    """
    Get cast and crew information for a movie
    
    Args:
        movie_id: TMDB movie ID
        
    Returns:
        Cast and crew information
    """
    try:
        # Create cache key for movie credits
        cache_key = f"movie_credits_{movie_id}"
        
        # Define function to fetch data if cache miss
        def fetch_data():
            return tmdb_service.get_movie_credits(movie_id)
        
        # Get data from cache or fetch it
        credits = get_cached_data(cache_key, fetch_data)
        
        # Process and return the credits information
        return MovieCredits(
            cast=[
                CastMember(
                    id=member["id"],
                    name=member["name"],
                    character=member["character"],
                    profile_path=tmdb_service.get_poster_url(member["profile_path"])
                )
                for member in credits["cast"]
            ],
            crew=[
                CrewMember(
                    id=member["id"],
                    name=member["name"],
                    job=member["job"],
                    department=member["department"],
                    profile_path=tmdb_service.get_poster_url(member["profile_path"])
                )
                for member in credits["crew"]
            ]
        )
    except Exception as e:
        logger.error(f"Error fetching movie credits: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}/videos", response_model=List[Video])
async def get_movie_videos(movie_id: int):
    """
    Get videos (trailers, teasers, etc.) for a movie
    
    Args:
        movie_id: TMDB movie ID
        
    Returns:
        List of video information
    """
    try:
        # Create cache key for movie videos
        cache_key = f"movie_videos_{movie_id}"
        
        # Define function to fetch data if cache miss
        def fetch_data():
            return tmdb_service.get_movie_videos(movie_id)
        
        # Get data from cache or fetch it
        videos = get_cached_data(cache_key, fetch_data)
        
        # Process and return video information
        return [
            Video(
                id=video["id"],
                key=video["key"],
                name=video["name"],
                site=video["site"],
                type=video["type"]
            )
            for video in videos["results"]
        ]
    except Exception as e:
        logger.error(f"Error fetching movie videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))