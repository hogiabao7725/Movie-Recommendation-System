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

let allRecommendations = [];
let currentPage = 1;
const MOVIES_PER_PAGE = 8;
const MAX_PAGES = 3;

function renderRecommendationsPage(page) {
    const recommendationsContainer = document.getElementById('recommendation-list');
    recommendationsContainer.innerHTML = '';
    const startIdx = (page - 1) * MOVIES_PER_PAGE;
    const endIdx = startIdx + MOVIES_PER_PAGE;
    const moviesToShow = allRecommendations.slice(startIdx, endIdx);
    // 4x2 grid: 4 movies per row
    for (let row = 0; row < 2; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row g-4 mb-2';
        for (let col = 0; col < 4; col++) {
            const movieIdx = row * 4 + col;
            if (movieIdx < moviesToShow.length) {
                const movieCard = Utils.createMovieCard(moviesToShow[movieIdx], true);
                rowDiv.appendChild(movieCard);
            }
        }
        recommendationsContainer.appendChild(rowDiv);
    }
    renderPaginationControls();
}

function renderPaginationControls() {
    const recommendationsContainer = document.getElementById('recommendation-list');
    let pagination = document.getElementById('recommendation-pagination');
    if (!pagination) {
        pagination = document.createElement('div');
        pagination.id = 'recommendation-pagination';
        pagination.className = 'd-flex justify-content-center my-4';
        recommendationsContainer.parentNode.appendChild(pagination);
    }
    let totalPages = Math.ceil(allRecommendations.length / MOVIES_PER_PAGE);
    if (totalPages > MAX_PAGES) totalPages = MAX_PAGES;
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} mx-1" data-page="${i}">${i}</button>`;
    }
    pagination.innerHTML = html;
    Array.from(pagination.querySelectorAll('button')).forEach(btn => {
        btn.addEventListener('click', function() {
            currentPage = parseInt(this.getAttribute('data-page'));
            renderRecommendationsPage(currentPage);
        });
    });
}

function loadRecommendations(userId) {
    const recommendationsContainer = document.getElementById('recommendation-list');
    if (!recommendationsContainer) return;
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    // Request up to 24 recommendations from the API
    ApiService.getRecommendations(userId, MOVIES_PER_PAGE * MAX_PAGES)
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
            
            // Filter recommendations:
            allRecommendations = [];
            const MAX_TOTAL_MOVIES = MOVIES_PER_PAGE * MAX_PAGES; // 24 movies total
            for (let i = 0; i < recommendations.length; i++) {
                const rec = recommendations[i];
                let matchScore = rec._matchScore;
                if (matchScore === null || matchScore <= 0) break;
                allRecommendations.push({
                    id: rec.movieId,
                    title: rec.title,
                    poster_path: rec.poster_path,
                    vote_average: rec.vote_average,
                    genres: rec.genres,
                    release_date: rec.release_date,
                    content_score: rec.content_score,
                    collab_score: rec.collab_score,
                    final_score: rec.final_score,
                    content_weight: rec.content_weight,
                    collab_weight: rec.collab_weight
                });
                if (allRecommendations.length >= MAX_TOTAL_MOVIES) break;
            }
            currentPage = 1;
            renderRecommendationsPage(currentPage);
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
