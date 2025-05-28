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
            console.error('Error loading popular movies:', error);
            popularMoviesContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to load popular movies. Please try again later.
                    </div>
                </div>
            `;
        });
}

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
    
    // Show loading spinner while fetching data
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Request exactly 4 recommendations directly from API
    ApiService.getRecommendations(userId, 4)
        .then(recommendations => {
            recommendationsContainer.innerHTML = '';
            
            if (!recommendations || recommendations.length === 0) {
                recommendationsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No recommendations found for your profile.</p>
                    </div>
                `;
                return;
            }
            
            // Create movie cards directly from the response
            // This assumes the backend returns standardized movie objects
            recommendations.forEach(movie => {
                // Include showScore=true to display recommendation scores
                const movieCard = Utils.createMovieCard(movie, true);
                recommendationsContainer.appendChild(movieCard);
            });
        })
        .catch(error => {
            console.error('Error loading recommendations:', error);
            recommendationsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to load recommendations. Please try again later.
                    </div>
                </div>
            `;
        });
}
