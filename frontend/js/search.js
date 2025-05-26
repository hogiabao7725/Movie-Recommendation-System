/**
 * Search Results Page JavaScript
 * This file handles the functionality for the search results page
 */

// Track the current page
let currentPage = 1;
// Estimated total pages (will be updated after API call)
let totalPages = 1;
// Current search query
let currentQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    // Get search query from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        currentQuery = query;
        // Update the search input field with the query
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
        }
        
        // Update the search term display
        const searchTermElement = document.getElementById('search-term');
        if (searchTermElement) {
            searchTermElement.textContent = query;
        }
        
        // Load search results
        searchMovies(query, currentPage);
    } else {
        // No query provided, show message
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-warning" role="alert">
                        No search query provided. Please enter a search term.
                    </div>
                </div>
            `;
        }
    }
});

/**
 * Search for movies and display results
 * @param {string} query - Search query
 * @param {number} page - Page number
 */
function searchMovies(query, page) {
    currentPage = page;
    
    const resultsContainer = document.getElementById('search-results');
    
    if (!resultsContainer) return;
    
    // Show loading spinner
    resultsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    ApiService.searchMovies(query, page)
        .then(movies => {
            resultsContainer.innerHTML = '';
            
            if (movies.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p>No movies found matching "${query}". Try a different search term.</p>
                    </div>
                `;
                
                // Hide pagination
                document.getElementById('pagination').innerHTML = '';
                return;
            }
            
            // Create movie cards
            movies.forEach(movie => {
                const movieCard = Utils.createMovieCard(movie);
                resultsContainer.appendChild(movieCard);
            });
            
            // Update pagination
            Utils.createPagination('pagination', currentPage, totalPages, (newPage) => {
                searchMovies(query, newPage);
                // Scroll to top when page changes
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        })
        .catch(error => {
            console.error('Error searching movies:', error);
            resultsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        Failed to search movies. Please try again later.
                    </div>
                </div>
            `;
        });
}
