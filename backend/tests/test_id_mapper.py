import sys
from pathlib import Path
import pytest

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.data.id_mapper import MovieIdMapper
from app.core.config import settings

def test_movie_id_mapping():
    """Test ID mapping between MovieLens and TMDB"""
    # Initialize mapper
    mapper = MovieIdMapper()
    mapper.load_mappings()
    
    # Test with sample MovieLens ID
    movielens_id = 1
    
    # Get TMDB ID
    tmdb_id = mapper.get_tmdb_id(movielens_id)
    print(f"\nMovieLens ID {movielens_id} maps to TMDB ID: {tmdb_id}")
    assert tmdb_id is not None, f"Failed to get TMDB ID for MovieLens ID {movielens_id}"
      # Test reverse mapping
    movielens_from_tmdb = mapper.get_movielens_id_from_tmdb(tmdb_id)
    print(f"TMDB ID {tmdb_id} maps back to MovieLens ID: {movielens_from_tmdb}")
    assert movielens_from_tmdb == movielens_id, f"Expected MovieLens ID {movielens_id}, got {movielens_from_tmdb}"
    print("\nAll ID mapping tests passed successfully!")

def show_tmdb_id(movielens_id):
    """Hiển thị TMDB ID tương ứng với một MovieLens ID cụ thể"""
    # Initialize mapper
    mapper = MovieIdMapper()
    mapper.load_mappings()
    
    # Get and print TMDB ID
    tmdb_id = mapper.get_tmdb_id(movielens_id)
    print(f"\nMovieLens ID {movielens_id} → TMDB ID: {tmdb_id}")
    
    return tmdb_id

if __name__ == "__main__":
    # Chỉ chạy một trong các dòng dưới đây
    # test_movie_id_mapping()
    show_tmdb_id(1)  # Thay số 1 bằng ID MovieLens mà bạn muốn tra cứu