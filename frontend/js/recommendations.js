/**
 * Recommendations Page JavaScript
 * Handles movie recommendations with optimized loading
 */

// Cache for recommendations
const recommendationsCache = {
    data: null,
    timestamp: null,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    isValid() {
        return this.data && this.timestamp && 
               (Date.now() - this.timestamp < this.CACHE_DURATION);
    },

    set(data) {
        this.data = data;
        this.timestamp = Date.now();
    },

    get() {
        return this.isValid() ? this.data : null;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = Utils.getCurrentUser();
    const recommendationContent = document.getElementById('recommendation-content');
    
    if (currentUser) {
        recommendationContent.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Showing personalized recommendations for User ID: ${currentUser.id}
            </div>
        `;
        loadRecommendations(currentUser.id);
    } else {
        recommendationContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Please log in to see your personalized movie recommendations.
                <button id="recommend-login-btn" class="btn btn-primary ms-3">Login</button>
            </div>
        `;
        
        document.getElementById('recommend-login-btn')?.addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('loginModal')).show();
        });
    }
});

let allRecommendations = [];
let currentPage = 1;
const MOVIES_PER_PAGE = 8;
const MAX_PAGES = 3;
let isLoading = false;

function renderRecommendationsPage(page) {
    const recommendationsContainer = document.getElementById('recommendation-list');
    if (!recommendationsContainer) return;

    recommendationsContainer.innerHTML = '';
    const startIdx = (page - 1) * MOVIES_PER_PAGE;
    const endIdx = startIdx + MOVIES_PER_PAGE;
    const moviesToShow = allRecommendations.slice(startIdx, endIdx);

    // Create movie cards in parallel
    const movieCards = moviesToShow.map(movie => Utils.createMovieCard(movie, true));
    
    // Render in 4x2 grid
    for (let row = 0; row < 2; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row g-4 mb-2';
        for (let col = 0; col < 4; col++) {
            const movieIdx = row * 4 + col;
            if (movieCards[movieIdx]) {
                rowDiv.appendChild(movieCards[movieIdx]);
            }
        }
        recommendationsContainer.appendChild(rowDiv);
    }
    renderPaginationControls();
}

function renderPaginationControls() {
    const pagination = document.getElementById('recommendation-pagination') || 
                      document.createElement('div');
    pagination.id = 'recommendation-pagination';
    pagination.className = 'd-flex justify-content-center my-4';
    
    const totalPages = Math.min(Math.ceil(allRecommendations.length / MOVIES_PER_PAGE), MAX_PAGES);
    pagination.innerHTML = Array.from({length: totalPages}, (_, i) => i + 1)
        .map(page => `
            <button class="btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-outline-primary'} mx-1" 
                    data-page="${page}">${page}</button>
        `).join('');

    pagination.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderRecommendationsPage(currentPage);
        });
    });

    if (!document.getElementById('recommendation-pagination')) {
        document.getElementById('recommendation-list').parentNode.appendChild(pagination);
    }
}

async function loadRecommendations(userId) {
    const recommendationsContainer = document.getElementById('recommendation-list');
    if (!recommendationsContainer || isLoading) return;
    
    isLoading = true;
    recommendationsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    try {
        // Check cache first
        const cachedData = recommendationsCache.get();
        if (cachedData) {
            allRecommendations = cachedData;
            renderRecommendationsPage(currentPage);
            return;
        }

        const recommendations = await ApiService.getRecommendations(userId, MOVIES_PER_PAGE * MAX_PAGES);
        
        if (!recommendations?.length) {
            recommendationsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p>No recommendations found for your profile.</p>
                </div>
            `;
            return;
        }

        // Process recommendations in parallel
        allRecommendations = await Promise.all(
            recommendations
                .filter(rec => rec && (rec.content_score || rec.collab_score || rec.final_score))
                .map(async rec => ({
                    id: rec.movieId ?? rec.id,
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
                }))
        );

        // Sort by match score
        allRecommendations.sort((a, b) => {
            const scoreA = (a.content_score * a.content_weight + a.collab_score * a.collab_weight) || a.final_score || 0;
            const scoreB = (b.content_score * b.content_weight + b.collab_score * b.collab_weight) || b.final_score || 0;
            return scoreB - scoreA;
        });

        // Cache the results
        recommendationsCache.set(allRecommendations);
        
        currentPage = 1;
        renderRecommendationsPage(currentPage);
    } catch (error) {
        console.error('Error loading recommendations:', error);
        recommendationsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-danger" role="alert">
                    Failed to load recommendations. Please try again later.
                </div>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}