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
    
    ApiService.getPopularMovies(1)
        .then(movies => {
            // Show only first 4 movies on homepage
            const moviesToShow = movies.slice(0, 4);
            
            popularMoviesContainer.innerHTML = '';
            
            if (moviesToShow.length === 0) {
                popularMoviesContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No popular movies found.</p>
                    </div>
                `;
                return;
            }
            
            // Create movie cards
            moviesToShow.forEach(movie => {
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
            const movieIds = recommendations.map(rec => rec.movieId);
            console.log('Getting movie details for IDs:', movieIds);
            
            ApiService.getMultipleMovies(movieIds)
                .then(movieDetails => {
                    console.log('Movie details received:', movieDetails);
                    // Combine recommendation data with movie details
                    const fullRecommendations = recommendations.map(rec => {
                        const movie = movieDetails.find(m => m.id === rec.movieId);
                        if (movie) {
                            return {
                                ...movie,
                                content_score: rec.content_score,
                                collab_score: rec.collab_score,
                                final_score: rec.final_score
                            };
                        }
                        return null;
                    }).filter(Boolean);
                    
                    if (fullRecommendations.length === 0) {
                        recommendationsContainer.innerHTML = `
                            <div class="col-12 text-center py-5">
                                <p>No recommendation details available.</p>
                            </div>
                        `;
                        return;
                    }
                    
                    // Create movie cards for recommendations
                    fullRecommendations.forEach(movie => {
                        const movieCard = Utils.createMovieCard(movie, true);
                        recommendationsContainer.appendChild(movieCard);
                    });
                })
                .catch(error => {
                    console.error('Error loading movie details for recommendations:', error);
                    recommendationsContainer.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <div class="alert alert-danger" role="alert">
                                Failed to load recommendation details. Please try again later.
                            </div>
                        </div>
                    `;
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
