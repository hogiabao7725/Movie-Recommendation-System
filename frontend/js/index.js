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
 */
function loadPopularMovies() {
    const popularMoviesContainer = document.getElementById('popular-movies');
    
    if (!popularMoviesContainer) return;
    
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
 * @param {number} userId - The user ID to get recommendations for
 */
function loadRecommendationsPreview(userId) {
    const recommendationsContainer = document.getElementById('recommendations-preview');
    
    if (!recommendationsContainer) return;
    
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
      console.log('Requesting recommendations for user:', userId);
    ApiService.getRecommendations(userId, 4)
        .then(recommendations => {
            console.log('Recommendations received:', recommendations);
            recommendationsContainer.innerHTML = '';
            
            if (!recommendations || recommendations.length === 0) {
                recommendationsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No recommendations found for your profile.</p>
                    </div>
                `;
                return;
            }
            
            // Get movie details for recommended movies
            const moviesToShow = recommendations.map(rec => ({
                id: rec.movieId,
                title: rec.title,
                poster_path: rec.poster_path,
                vote_average: rec.vote_average,
                genres: rec.genres,
                release_date: rec.release_date,
                // include recommendation scores if needed
                content_score: rec.content_score,
                collab_score: rec.collab_score,
                final_score: rec.final_score
            }));
            
            moviesToShow.forEach(movie => {
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
