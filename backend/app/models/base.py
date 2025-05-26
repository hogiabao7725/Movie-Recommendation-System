from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseRecommender(ABC):
    """Base class for recommendation models"""
    
    def __init__(self):
        """Initialize the recommender"""
        self.is_fitted = False
    
    @abstractmethod
    def fit(self, **kwargs) -> None:
        """
        Fit the model
        Args:
            **kwargs: Model-specific parameters
        """
        pass
    
    @abstractmethod
    def get_recommendations(self, user_id: int, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get movie recommendations for a user
        Args:
            user_id: User ID
            n_recommendations: Number of recommendations to return
        Returns:
            List of movie recommendations
        """
        pass
    
    def _check_is_fitted(self) -> None:
        """Check if model is fitted"""
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call fit() first.") 