/**
 * Recommendations Page JavaScript
 * This file handles the functionality for the recommendations page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = Utils.getCurrentUser();
    const recommendationContent = document.getElementById('recommendation-content');
    
    if (currentUser) {
        // User is logged in, load recommendations
        recommendationContent.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Showing personalized recommendations for User ID: ${currentUser.id}
            </div>
        `;
        loadRecommendations(currentUser.id);
    } else {
        // User is not logged in, show login message
        recommendationContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Please log in to see your personalized movie recommendations.
                <button id="recommend-login-btn" class="btn btn-primary ms-3">Login</button>
            </div>
        `;
        
        // Add event listener to login button
        const loginBtn = document.getElementById('recommend-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            });
        }
    }
});

/**
 * Load personalized recommendations for a user
 * @param {number} userId - The user ID to get recommendations for
 */
function loadRecommendations(userId) {
    const recommendationsContainer = document.getElementById('recommendation-list');
    
    if (!recommendationsContainer) return;
    
    // Show loading spinner
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
      console.log('Loading recommendations for user ID:', userId);
    ApiService.getRecommendations(userId)
        .then(recommendations => {
            console.log('Received recommendations:', recommendations);
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
