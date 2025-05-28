/**
 * Index Page JavaScript
 * This file handles the functionality for the home page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load popular movies for the homepage
    loadPopularMovies();
    
    // Check if user is logged in and load recommendations
    const currentUser = Utils.getCurrentUser();
    if (currentUser) {
        loadRecommendationsPreview(currentUser.id);
    }
});

/**
 * Load popular movies and display them on the homepage
 * This function fetches popular movies from the API
 * and displays them in the popular movies container.
 * It shows exactly 4 movies for the homepage preview.
 */
function loadPopularMovies() {
    const popularMoviesContainer = document.getElementById('popular-movies');
    
    if (!popularMoviesContainer) return;
    
    // Show loading spinner while fetching data
    popularMoviesContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Request exactly 4 movies directly from API
    ApiService.getPopularMovies(1, 4)
        .then(movies => {
            popularMoviesContainer.innerHTML = '';
            
            if (movies.length === 0) {
                popularMoviesContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No popular movies found.</p>
                    </div>
                `;
                return;
            }
            
            // Create movie cards
            movies.forEach(movie => {
                const movieCard = Utils.createMovieCard(movie);
                popularMoviesContainer.appendChild(movieCard);
            });
        })
        .catch(error => {
            console.error('(Home) Error loading popular movies:', error);
            popularMoviesContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to load popular movies. Please try again later.
                    </div>
                </div>
            `;
        });
}

// Cache key and cache duration (5 minutes)
const RECOMMENDATION_CACHE_KEY = 'home_recommendations_cache';
const RECOMMENDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms
// Store the current AbortController globally for this page
let currentRecommendationAbortController = null;

/**
 * Load recommendation preview for the homepage
 * This function fetches personalized movie recommendations for a user
 * and displays them in the recommendations container.
 * It shows exactly 4 movies and includes their recommendation scores.
 * 
 * @param {number} userId - The user ID to get recommendations for
 */
function loadRecommendationsPreview(userId) {
    const recommendationsContainer = document.getElementById('recommendations-preview');
    if (!recommendationsContainer) return;

    // Check cache
    const cacheRaw = localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    let cache = null;
    if (cacheRaw) {
        try {
            cache = JSON.parse(cacheRaw);
        } catch (e) { cache = null; }
    }
    const now = Date.now();
    if (cache && cache.userId === userId && (now - cache.timestamp < RECOMMENDATION_CACHE_DURATION)) {
        // Use cached data if valid
        renderRecommendationsPreview(cache.data, recommendationsContainer);
        return;
    }

    // Abort previous request if still running
    if (currentRecommendationAbortController) {
        currentRecommendationAbortController.abort();
    }
    currentRecommendationAbortController = new AbortController();

    // Show loading spinner
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    // Fetch recommendations with abort support
    ApiService.getRecommendations(userId, 4, currentRecommendationAbortController.signal)
        .then(recommendations => {
            // If aborted, do nothing
            if (!recommendations) return;
            // Save to cache
            localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify({
                userId: userId,
                data: recommendations,
                timestamp: Date.now()
            }));
            renderRecommendationsPreview(recommendations, recommendationsContainer);
        })
        .catch(error => {
            if (error && error.name === 'AbortError') return; // Ignore abort errors
            console.error('(Home) Error loading recommendations:', error);
            recommendationsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to load recommendations. Please try again later.
                    </div>
                </div>
            `;
        });
}

// Helper to render recommendations (same as before)
function renderRecommendationsPreview(recommendations, container) {
    container.innerHTML = '';
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p>No recommendations found for your profile.</p>
            </div>
        `;
        return;
    }
    // Calculate match score for sorting
    recommendations.forEach(rec => {
        if (
            rec.content_score !== undefined &&
            rec.collab_score !== undefined &&
            rec.content_weight !== undefined &&
            rec.collab_weight !== undefined
        ) {
            rec._matchScore = rec.content_score * rec.content_weight + rec.collab_score * rec.collab_weight;
        } else if (rec.final_score !== undefined) {
            rec._matchScore = rec.final_score;
        } else {
            rec._matchScore = -Infinity;
        }
    });
    // Sort by match score descending
    recommendations.sort((a, b) => b._matchScore - a._matchScore);
    // Create movie cards
    recommendations.forEach(movie => {
        const movieCard = Utils.createMovieCard(movie, true);
        container.appendChild(movieCard);
    });
}
