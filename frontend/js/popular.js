/**
 * Popular Movies Page JavaScript
 * This file handles the functionality for the popular movies page
 */

// Track the current page
let currentPage = 1;
// Estimated total pages (will be updated after API call)
let totalPages = 10;

document.addEventListener('DOMContentLoaded', function() {
    // Load popular movies
    loadPopularMovies(currentPage);
});

/**
 * Load popular movies and display them
 * @param {number} page - Page number to load
 */
function loadPopularMovies(page) {
    currentPage = page;
    
    const moviesContainer = document.getElementById('popular-movies-list');
    
    if (!moviesContainer) return;
    
    // Show loading spinner
    moviesContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    ApiService.getPopularMovies(page)
        .then(movies => {
            moviesContainer.innerHTML = '';
            
            if (movies.length === 0) {
                moviesContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No movies found.</p>
                    </div>
                `;
                return;
            }
            
            // Create movie cards
            movies.forEach(movie => {
                const movieCard = Utils.createMovieCard(movie);
                moviesContainer.appendChild(movieCard);
            });
            
            // Update pagination
            Utils.createPagination('pagination', currentPage, totalPages, (newPage) => {
                loadPopularMovies(newPage);
                // Scroll to top when page changes
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        })
        .catch(error => {
            console.error('Error loading popular movies:', error);
            moviesContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to load popular movies. Please try again later.
                    </div>
                </div>
            `;
        });
}
