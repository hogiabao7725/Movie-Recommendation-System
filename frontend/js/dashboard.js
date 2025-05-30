// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    const loadBtn = document.getElementById('load-dashboard');
    const userIdInput = document.getElementById('user-id');
    const dashboardContent = document.getElementById('dashboard-content');
    const loadingSection = document.getElementById('loading');
    const errorSection = document.getElementById('error-message');

    // Event listener for the load button
    loadBtn.addEventListener('click', loadUserDashboard);

    // Also load when Enter is pressed in the input field
    userIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadUserDashboard();
        }
    });

    // Try to load from URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('userId')) {
        userIdInput.value = urlParams.get('userId');
        loadUserDashboard();
    }

    function loadUserDashboard() {
        const userId = userIdInput.value;
        if (!userId) {
            alert('Please enter a valid User ID');
            return;
        }

        // Update URL with user ID parameter
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('userId', userId);
        window.history.pushState({}, '', newUrl);

        // Show loading and hide other sections
        dashboardContent.classList.add('hidden');
        errorSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');        // Fetch dashboard data
        ApiService.getUserDashboard(userId)
            .then(data => {
                // Hide loading and show content
                loadingSection.classList.add('hidden');
                dashboardContent.classList.remove('hidden');

                // Render dashboard components
                renderGenrePreferences(data.genre_preferences);
                renderUserFactors(data.user_factors);
                renderRecommendations(data.recommendations);
            })
            .catch(error => {
                console.error('Error loading dashboard:', error);
                loadingSection.classList.add('hidden');
                errorSection.classList.remove('hidden');
            });
    }

    function renderGenrePreferences(genrePreferences) {
        // If no data, show message
        if (!genrePreferences || Object.keys(genrePreferences).length === 0) {
            document.getElementById('genre-insight').textContent = 
                'No genre preferences data available for this user.';
            return;
        }

        // Get the canvas and create chart
        const ctx = document.getElementById('genre-chart').getContext('2d');
        
        // Prepare data for chart
        const labels = Object.keys(genrePreferences);
        const data = Object.values(genrePreferences);
        
        // Create pie chart
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#C9CBCF', '#7BC043', '#F37736', '#EE4035'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // Generate insight text
        const topGenres = labels.slice(0, 3).join(', ');
        document.getElementById('genre-insight').textContent = 
            `Based on your viewing history and preferences, you seem to enjoy ${topGenres} movies the most.`;
    }

    function renderUserFactors(userFactors) {
        // If no data, exit
        if (!userFactors || userFactors.length === 0) return;

        // Get the canvas and create chart
        const ctx = document.getElementById('taste-profile-chart').getContext('2d');
        
        // Prepare data for chart
        const labels = userFactors.map(f => f.factor);
        const data = userFactors.map(f => f.value);
        
        // Create bar chart
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Factor Weight',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }    function renderRecommendations(recommendations) {
        const container = document.getElementById('recommendations-grid');
        container.innerHTML = '';
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<p>No recommendations data available</p>';
            return;
        }

        // Only show top 12 recommendations for dashboard display
        const moviesToShow = recommendations.slice(0, 12);
        
        moviesToShow.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
              // Construct movie card HTML without poster
            card.innerHTML = `
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <p class="movie-genres">${Array.isArray(movie.genres) ? movie.genres.join(', ') : movie.genres}</p>                    <div class="score-container">
                        <div class="score-item">
                            <span class="score-label">Content Match</span>
                            <span class="score-value content-score">${(movie.content_score * 100).toFixed(0)}%</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Collaborative Match</span>
                            <span class="score-value collab-score">${(movie.collab_score * 100).toFixed(0)}%</span>
                        </div>
                        <div class="final-score">
                            Match Score: ${((movie.content_score * 0.5 + movie.collab_score * 0.5) * 100).toFixed(0)}%
                        </div>
                        <div class="final-score">
                            (Content * 50% + Collaborative * 50%)
                        </div>
                    </div>
                </div>
            `;
            
            // Add click event to go to movie details
            card.addEventListener('click', () => {
                window.location.href = `movie-details.html?id=${movie.movieId}`;
            });
            
            container.appendChild(card);
        });
    }
});
