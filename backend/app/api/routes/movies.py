from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict
from pydantic import BaseModel
from ..services.tmdb import TMDBService
from ...core.config import settings
from ...core.logging import logger

router = APIRouter()
tmdb_service = TMDBService(api_key=settings.TMDB_API_KEY)

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

@router.get("/movies/popular", response_model=List[Movie])
async def get_popular_movies(page: int = Query(1, ge=1)):
    """Get list of popular movies from TMDB"""
    try:
        response = tmdb_service.get_popular_movies(page=page)
        movies = []
        for movie in response["results"]:
            # Get full movie details including genres
            details = tmdb_service.get_movie_details(movie["id"])
            movies.append(Movie(
                id=movie["id"],
                title=movie["title"],
                overview=movie["overview"],
                poster_path=tmdb_service.get_poster_url(movie["poster_path"]),
                release_date=movie["release_date"],
                vote_average=movie["vote_average"],
                genres=[genre["name"] for genre in details["genres"]]
            ))
        return movies
    except Exception as e:
        logger.error(f"Error fetching popular movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/search", response_model=List[Movie])
async def search_movies(query: str, page: int = Query(1, ge=1)):
    """Search movies by title"""
    try:
        response = tmdb_service.search_movies(query=query, page=page)
        movies = []
        for movie in response["results"]:
            # Get full movie details including genres
            details = tmdb_service.get_movie_details(movie["id"])
            movies.append(Movie(
                id=movie["id"],
                title=movie["title"],
                overview=movie["overview"],
                poster_path=tmdb_service.get_poster_url(movie["poster_path"]),
                release_date=movie["release_date"],
                vote_average=movie["vote_average"],
                genres=[genre["name"] for genre in details["genres"]]
            ))
        return movies
    except Exception as e:
        logger.error(f"Error searching movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}", response_model=Movie)
async def get_movie_details(movie_id: int):
    """Get detailed information about a movie"""
    try:
        movie = tmdb_service.get_movie_details(movie_id)
        return Movie(
            id=movie["id"],
            title=movie["title"],
            overview=movie["overview"],
            poster_path=tmdb_service.get_poster_url(movie["poster_path"]),
            release_date=movie["release_date"],
            vote_average=movie["vote_average"],
            genres=[genre["name"] for genre in movie["genres"]]
        )
    except Exception as e:
        logger.error(f"Error fetching movie details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}/credits", response_model=MovieCredits)
async def get_movie_credits(movie_id: int):
    """Get cast and crew information for a movie"""
    try:
        credits = tmdb_service.get_movie_credits(movie_id)
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
    """Get videos (trailers, teasers, etc.) for a movie"""
    try:
        videos = tmdb_service.get_movie_videos(movie_id)
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

@router.get("/movies/details", response_model=List[Movie])
async def get_movies_details(ids: str = Query(..., description="Comma-separated list of movie IDs")):
    """Get details for multiple movies by IDs (batch endpoint)"""
    try:
        id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        movies = []
        for movie_id in id_list:
            try:
                movie = tmdb_service.get_movie_details(movie_id)
                movies.append(Movie(
                    id=movie["id"],
                    title=movie["title"],
                    overview=movie["overview"],
                    poster_path=tmdb_service.get_poster_url(movie["poster_path"]),
                    release_date=movie["release_date"],
                    vote_average=movie["vote_average"],
                    genres=[genre["name"] for genre in movie["genres"]]
                ))
            except Exception as e:
                logger.error(f"Error fetching details for movie {movie_id}: {str(e)}")
                continue  # Skip movies that fail
        return movies
    except Exception as e:
        logger.error(f"Error in batch movie details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 