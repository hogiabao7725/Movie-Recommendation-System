/**
 * API Service for Movie Recommendation System
 * This file contains all the API calls to the backend server
 */

// Debug log
console.log('API service initialized');

// Configure the base URL for API calls - change this to match your backend server
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// API Service object
const ApiService = {
    /**
     * Get popular movies
     * @param {number} page - Page number for pagination
     * @returns {Promise} - Promise with movie data
     */
    getPopularMovies: function(page = 1) {
        console.log(`Fetching popular movies from: ${API_BASE_URL}/movies/popular?page=${page}`);
        return fetch(`${API_BASE_URL}/movies/popular?page=${page}`)
            .then(response => {
                console.log('Popular movies response:', response);
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error('Error fetching popular movies:', error);
                throw error;
            });
    },

    /**
     * Search movies by query
     * @param {string} query - Search query
     * @param {number} page - Page number for pagination
     * @returns {Promise} - Promise with search results
     */
    searchMovies: function(query, page = 1) {
        return fetch(`${API_BASE_URL}/movies/search?query=${encodeURIComponent(query)}&page=${page}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
    },

    /**
     * Get movie details by ID
     * @param {number} movieId - Movie ID 
     * @returns {Promise} - Promise with movie details
     */
    getMovieDetails: function(movieId) {
        return fetch(`${API_BASE_URL}/movies/${movieId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
    },

    /**
     * Get movie credits (cast and crew) by movie ID
     * @param {number} movieId - Movie ID
     * @returns {Promise} - Promise with movie credits
     */
    getMovieCredits: function(movieId) {
        return fetch(`${API_BASE_URL}/movies/${movieId}/credits`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
    },

    /**
     * Get movie videos (trailers, clips, etc.) by movie ID
     * @param {number} movieId - Movie ID
     * @returns {Promise} - Promise with movie videos
     */
    getMovieVideos: function(movieId) {
        return fetch(`${API_BASE_URL}/movies/${movieId}/videos`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
    },

    /**
     * Get personalized movie recommendations for a user
     * @param {number} userId - User ID
     * @param {number} count - Number of recommendations to get
     * @returns {Promise} - Promise with recommended movies
     */
    getRecommendations: function(userId, count = 10) {
        console.log(`Fetching recommendations for user ${userId}, count: ${count}`);
        console.log(`Using URL: ${API_BASE_URL}/recommendations`);
        
        return fetch(`${API_BASE_URL}/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                n_recommendations: count
            })
        })
        .then(response => {
            console.log('Recommendations response:', response);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            throw error;
        });
    }
};
