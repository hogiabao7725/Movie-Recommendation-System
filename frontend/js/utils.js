/**
 * Utilities for Movie Recommendation System
 * This file contains helper functions used across the application
 */

// Store the user data in local storage
const USER_STORAGE_KEY = 'movie_rex_user';

// Utilities object
const Utils = {
    /**
     * Format date from YYYY-MM-DD to Month DD, YYYY
     * @param {string} dateString - Date string in format YYYY-MM-DD
     * @returns {string} - Formatted date string
     */
    formatDate: function(dateString) {
        if (!dateString) return 'Release date unknown';
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', options);
    },
    
    /**
     * Truncate text to a specified length and add ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length before truncating
     * @returns {string} - Truncated text
     */
    truncateText: function(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    /**
     * Create pagination controls
     * @param {string} elementId - ID of the element to append pagination
     * @param {number} currentPage - Current active page
     * @param {number} totalPages - Total number of pages
     * @param {function} onPageClick - Callback when page is clicked
     */
    createPagination: function(elementId, currentPage, totalPages, onPageClick) {
        if (!totalPages || totalPages <= 1) return;
        
        const paginationElement = document.getElementById(elementId);
        paginationElement.innerHTML = '';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        if (currentPage > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                onPageClick(currentPage - 1);
            });
        }
        prevLi.appendChild(prevLink);
        paginationElement.appendChild(prevLi);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';
            pageLink.textContent = i;
            
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                onPageClick(i);
            });
            
            pageLi.appendChild(pageLink);
            paginationElement.appendChild(pageLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        
        if (currentPage < totalPages) {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                onPageClick(currentPage + 1);
            });
        }
        
        nextLi.appendChild(nextLink);
        paginationElement.appendChild(nextLi);
    },
    
    /**
     * Create a movie card element
     * @param {Object} movie - Movie data object
     * @param {boolean} showFullDetails - Whether to show recommendation details 
     * @returns {HTMLElement} - Movie card DOM element
     */
    createMovieCard: function(movie, showRecommendationDetails = false) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 col-xl-3 mb-4';
        
        const card = document.createElement('div');
        card.className = 'movie-card h-100';
        card.setAttribute('data-movie-id', movie.id);
        
        // Create card HTML
        let cardContent = `
            <img src="${movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                class="movie-poster" alt="${movie.title}">
            <div class="card-body d-flex flex-column">
                <h5 class="movie-title">${movie.title}</h5>
                <div class="movie-genres">
                    ${movie.genres?.map(genre => `<span class="movie-genre">${genre}</span>`).join('') || ''}
                </div>
                <div class="movie-rating">
                    <i class="fas fa-star"></i>
                    <span>${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                </div>
                <p class="movie-release-date">${this.formatDate(movie.release_date)}</p>
        `;
        
        // Add recommendation metrics if applicable
        if (showRecommendationDetails && movie.content_score !== undefined) {
            const contentScorePercent = movie.content_score * 100;
            const collabScorePercent = movie.collab_score * 100;
            // Add weights if available
            let weightsHtml = '';
            if (movie.content_weight !== undefined && movie.collab_weight !== undefined) {
                weightsHtml = `<div class="recommendation-weights">Weights: Content <strong>${(movie.content_weight * 100).toFixed(0)}%</strong> &middot; Collaborative <strong>${(movie.collab_weight * 100).toFixed(0)}%</strong></div>`;
            }
            // Calculate match score on the frontend for display accuracy
            let matchScore = null;
            if (
                movie.content_score !== undefined &&
                movie.collab_score !== undefined &&
                movie.content_weight !== undefined &&
                movie.collab_weight !== undefined
            ) {
                matchScore = (movie.content_score * movie.content_weight + movie.collab_score * movie.collab_weight) * 100;
            } else if (movie.final_score !== undefined) {
                matchScore = movie.final_score * 100;
            }
            cardContent += `
                <div class="mt-auto">
                    <hr>
                    <div class="recommendation-metrics">
                        <span>Content: ${contentScorePercent.toFixed(0)}%</span>
                        <span>Collaborative: ${collabScorePercent.toFixed(0)}%</span>
                    </div>
                    ${weightsHtml}
                    <div class="score-bar">
                        <div class="content-score-bar" style="width: ${contentScorePercent}%"></div>
                        <div class="collab-score-bar" style="width: ${collabScorePercent}%"></div>
                    </div>
                    <div class="text-center mt-2">
                        <strong>Match Score: ${matchScore !== null ? matchScore.toFixed(0) : 'N/A'}%</strong>
                    </div>
                </div>
            `;
        }
        
        cardContent += `
            </div>
        `;
        
        card.innerHTML = cardContent;
        
        // Add click event to show movie details
        card.addEventListener('click', () => {
            this.showMovieDetails(movie.id);
        });
        
        col.appendChild(card);
        return col;
    },
    
    /**
     * Show movie details in a modal
     * @param {number} movieId - ID of the movie to show details for
     */
    showMovieDetails: function(movieId) {
        const modalElement = document.getElementById('movieDetailModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        const modalContent = document.getElementById('movie-detail-content');
        
        // Show loading spinner
        modalContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        modalInstance.show();
        
        // Fetch movie details, credits, and videos
        Promise.all([
            ApiService.getMovieDetails(movieId),
            ApiService.getMovieCredits(movieId),
            ApiService.getMovieVideos(movieId)
        ]).then(([movie, credits, videos]) => {
            // Create modal content with movie details
            let modalHtml = `
                <div class="movie-detail-header">
                    <img src="${movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                        class="movie-detail-poster" alt="${movie.title}">
                    <div class="movie-detail-info">
                        <h3>${movie.title}</h3>
                        <div class="movie-detail-genres">
                            ${movie.genres?.map(genre => `<span class="badge bg-secondary me-1">${genre}</span>`).join('') || ''}
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-star text-warning"></i>
                                <span>${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div>${this.formatDate(movie.release_date)}</div>
                        </div>
                        <div class="movie-detail-overview">
                            <h5>Overview</h5>
                            <p>${movie.overview || 'No overview available.'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Add cast section
            if (credits && credits.cast && credits.cast.length > 0) {
                const topCast = credits.cast.slice(0, 10); // Show only first 10 cast members
                
                modalHtml += `
                    <div class="movie-detail-cast">
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
            
            // Add videos section (trailers, etc.)
            if (videos && videos.length > 0) {
                const trailers = videos.filter(video => 
                    video.site.toLowerCase() === 'youtube' && 
                    (video.type.toLowerCase() === 'trailer' || video.type.toLowerCase() === 'teaser')
                );
                
                if (trailers.length > 0) {
                    modalHtml += `
                        <div class="movie-detail-videos">
                            <h5>Videos</h5>
                            <div class="row">
                                ${trailers.map(video => `
                                    <div class="col-md-6 mb-3">
                                        <div class="video-item" data-video-key="${video.key}">
                                            <i class="fab fa-youtube text-danger me-2"></i>
                                            ${video.name}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            
            // Update modal content
            modalContent.innerHTML = modalHtml;
            
            // Add event listeners to video items
            const videoItems = modalContent.querySelectorAll('.video-item');
            videoItems.forEach(item => {
                item.addEventListener('click', () => {
                    const videoKey = item.getAttribute('data-video-key');
                    if (videoKey) {
                        window.open(`https://www.youtube.com/watch?v=${videoKey}`, '_blank');
                    }
                });
            });
        }).catch(error => {
            console.error('Error fetching movie details:', error);
            modalContent.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load movie details. Please try again.
                </div>
            `;
        });
    },
    
    /**
     * Save user to local storage
     * @param {number} userId - User ID to save
     */
    saveUser: function(userId) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: userId }));
    },
    
    /**
     * Get current user from local storage
     * @returns {Object|null} - User object or null if not logged in
     */
    getCurrentUser: function() {
        const userJson = localStorage.getItem(USER_STORAGE_KEY);
        if (!userJson) return null;
        
        try {
            return JSON.parse(userJson);
        } catch (e) {
            console.error('Error parsing user data from local storage', e);
            return null;
        }
    },
    
    /**
     * Clear user from local storage (logout)
     */
    clearUser: function() {
        localStorage.removeItem(USER_STORAGE_KEY);
    },
      /**
     * Setup login/logout functionality across the application
     */
    setupLoginButtons: function() {
        // Setup login modal trigger buttons
        const loginButtons = document.querySelectorAll('#login-btn, #header-login-btn');
        loginButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                    loginModal.show();
                });
            }
        });
        
        // Setup login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const userId = document.getElementById('userId').value;
                
                if (userId && parseInt(userId) > 0) {
                    this.saveUser(parseInt(userId));
                    window.location.reload();
                }
            });
        }
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.clearUser();
                window.location.reload();
            });
        }
        
        // Update UI based on login status
        this.updateLoginUI();
    },
      /**
     * Update UI elements based on login status
     */
    updateLoginUI: function() {
        const user = this.getCurrentUser();
        const userInfoElements = document.querySelectorAll('#user-info');
        const logoutBtns = document.querySelectorAll('#logout-btn');
        const headerLoginBtns = document.querySelectorAll('#header-login-btn');
        const loginBtns = document.querySelectorAll('#login-btn');
        
        if (user) {
            // User is logged in
            userInfoElements.forEach(element => {
                if (element) {
                    element.classList.remove('d-none');
                    const userIdSpan = element.querySelector('#current-user-id');
                    if (userIdSpan) {
                        userIdSpan.textContent = user.id;
                    }
                }
            });
            
            logoutBtns.forEach(btn => {
                if (btn) btn.classList.remove('d-none');
            });
            
            headerLoginBtns.forEach(btn => {
                if (btn) btn.classList.add('d-none');
            });
            
            // Hide login buttons in recommendations section
            loginBtns.forEach(btn => {
                const parent = btn.closest('#recommendations-preview');
                if (parent) {
                    parent.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    `;
                }
            });
        } else {
            // User is not logged in
            userInfoElements.forEach(element => {
                if (element) element.classList.add('d-none');
            });
            
            logoutBtns.forEach(btn => {
                if (btn) btn.classList.add('d-none');
            });
            
            headerLoginBtns.forEach(btn => {
                if (btn) btn.classList.remove('d-none');
            });
        }
    },
    
    /**
     * Setup global search form functionality
     */
    setupSearchForm: function() {
        const searchForms = document.querySelectorAll('#search-form');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('#search-input');
                const query = input.value.trim();
                
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            });
        });
    }
};

// Setup global functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    Utils.setupLoginButtons();
    Utils.setupSearchForm();
});
