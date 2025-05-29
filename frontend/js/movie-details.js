/**
 * Movie Details Page JavaScript
 * Handles the display of individual movie details and similar movie recommendations
 * Optimized for performance and clean code
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get movie ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    
    if (movieId) {
        loadMovieDetails(movieId);
        loadSimilarMovies(movieId);
    } else {
        // No movie ID provided - show error
        document.getElementById('movie-details-container').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No movie ID provided. Please return to the main page and select a movie.
            </div>
        `;
        document.getElementById('movie-recommendations').innerHTML = '';
    }

    // Initialize search form functionality
    document.getElementById('search-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchQuery = document.getElementById('search-input').value.trim();
        if (searchQuery) {
            window.location.href = `search.html?query=${encodeURIComponent(searchQuery)}`;
        }
    });

    // Handle login/logout
    const currentUser = Utils.getCurrentUser();
    const headerLoginBtn = document.getElementById('header-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userIdElement = document.getElementById('current-user-id');

    if (currentUser) {
        if (userInfo) userInfo.classList.remove('d-none');
        if (logoutBtn) logoutBtn.classList.remove('d-none');
        if (headerLoginBtn) headerLoginBtn.classList.add('d-none');
        if (userIdElement) userIdElement.textContent = currentUser.id;
    }

    // Login button event handler
    headerLoginBtn?.addEventListener('click', function() {
        new bootstrap.Modal(document.getElementById('loginModal')).show();
    });

    // Logout button event handler
    logoutBtn?.addEventListener('click', function() {
        Utils.clearUser();
        window.location.reload();
    });

    // Login form submission
    document.getElementById('login-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const userId = parseInt(document.getElementById('userId').value, 10);
        Utils.saveUser(userId);
        window.location.reload();
    });
});

/**
 * Load and display detailed information about a movie
 * @param {number} movieId - The ID of the movie to display
 */
function loadMovieDetails(movieId) {
    const detailsContainer = document.getElementById('movie-details-container');
    
    if (!detailsContainer) return;
    
    // Show loading spinner
    detailsContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch movie details, credits, and videos in parallel for better performance
    Promise.all([
        ApiService.getMovieDetails(movieId),
        ApiService.getMovieCredits(movieId),
        ApiService.getMovieVideos(movieId)
    ]).then(([movie, credits, videos]) => {
        // Update page title with movie name
        document.title = `${movie.title} - MovieRex`;
        
        // Build movie details HTML
        let detailsHtml = `
            <div class="movie-detail-header">
                <img src="${movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                    class="movie-detail-poster" alt="${movie.title}">
                <div class="movie-detail-info">
                    <h1>${movie.title}</h1>
                    <div class="movie-detail-genres">
                        ${movie.genres?.map(genre => `<span class="badge bg-secondary me-1">${genre}</span>`).join('') || ''}
                    </div>
                    <div class="d-flex align-items-center mb-2">
                        <div class="me-3">
                            <i class="fas fa-star text-warning"></i>
                            <span>${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div>${Utils.formatDate(movie.release_date)}</div>
                    </div>
                    <div class="movie-detail-overview">
                        <h5>Overview</h5>
                        <p>${movie.overview || 'No overview available.'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add cast section if available
        if (credits && credits.cast && credits.cast.length > 0) {
            const topCast = credits.cast.slice(0, 10); // Only show top 10 cast members for performance
            
            detailsHtml += `
                <div class="movie-detail-cast mt-4">
                    <h5>Cast</h5>
                    <div class="cast-list">
                        ${topCast.map(member => `
                            <div class="cast-item">
                                <img src="${member.profile_path || 'https://via.placeholder.com/80x80?text=No+Image'}"
                                    class="cast-photo" alt="${member.name}">
                                <p class="cast-name">${member.name}</p>
                                <p class="cast-character">${member.character}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Add videos section (trailers, etc.) if available
        if (videos && videos.length > 0) {
            // Filter for YouTube trailers and teasers
            const trailers = videos.filter(video => 
                video.site.toLowerCase() === 'youtube' && 
                (video.type.toLowerCase() === 'trailer' || video.type.toLowerCase() === 'teaser')
            );
            
            if (trailers.length > 0) {
                // Only show the first trailer for better performance
                const mainTrailer = trailers[0];
                detailsHtml += `
                    <div class="movie-detail-videos mt-4">
                        <h5>Trailer</h5>
                        <div class="ratio ratio-16x9">
                            <iframe 
                                src="https://www.youtube.com/embed/${mainTrailer.key}" 
                                title="${mainTrailer.name}"
                                allowfullscreen
                                loading="lazy">
                            </iframe>
                        </div>
                    </div>
                `;
            }
        }
        
        // Update the container with all the details
        detailsContainer.innerHTML = detailsHtml;
        
    }).catch(error => {
        console.error('Error loading movie details:', error);
        detailsContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                Failed to load movie details. Please try again.
            </div>
        `;
    });
}

/**
 * Load and display similar movies (recommendations)
 * @param {number} movieId - The ID of the movie to get recommendations for
 */
function loadSimilarMovies(movieId) {
    const recommendationsContainer = document.getElementById('movie-recommendations');
    
    if (!recommendationsContainer) return;
    
    // Show loading spinner
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Try to get user ID for personalized recommendations
    const currentUser = Utils.getCurrentUser();
    
    // If user is logged in, use their recommendations; otherwise use content-based recommendations
    const recommendationPromise = currentUser 
        ? ApiService.getRecommendations(currentUser.id, 4)
        : ApiService.getPopularMovies(1, 4);
        
    recommendationPromise.then(movies => {
        recommendationsContainer.innerHTML = '';
        
        if (!movies || movies.length === 0) {
            recommendationsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p>No recommendations available.</p>
                </div>
            `;
            return;
        }
        
        // Filter out the current movie from recommendations
        const filteredMovies = movies.filter(movie => movie.id != movieId);
        
        // If we have fewer than 4 movies after filtering, get more popular movies
        if (filteredMovies.length < 4 && currentUser) {
            ApiService.getPopularMovies(1, 8 - filteredMovies.length)
                .then(popularMovies => {
                    // Filter out current movie and any duplicates
                    const uniquePopular = popularMovies.filter(popMovie => 
                        popMovie.id != movieId && 
                        !filteredMovies.some(recMovie => recMovie.id === popMovie.id)
                    );
                    
                    // Create combined list with up to 4 movies
                    const combinedMovies = [...filteredMovies, ...uniquePopular].slice(0, 4);
                    renderRecommendations(combinedMovies, recommendationsContainer);
                })
                .catch(error => {
                    // Just use what we have if there's an error
                    renderRecommendations(filteredMovies, recommendationsContainer);
                });
        } else {
            // Render recommendations as-is
            renderRecommendations(filteredMovies.slice(0, 4), recommendationsContainer);
        }
    }).catch(error => {
        console.error('Error loading similar movies:', error);
        recommendationsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-danger" role="alert">
                    Failed to load movie recommendations. Please try again.
                </div>
            </div>
        `;
    });
}

/**
 * Render movie recommendations
 * @param {Array} movies - Array of movie objects to display
 * @param {HTMLElement} container - Container element to render in
 */
function renderRecommendations(movies, container) {
    container.innerHTML = '';
    
    movies.forEach(movie => {
        const movieCard = Utils.createMovieCard(movie);
        container.appendChild(movieCard);
    });
}
