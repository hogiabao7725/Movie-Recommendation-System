// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    const loadBtn = document.getElementById('load-dashboard');
    const userIdInput = document.getElementById('user-id');
    const dashboardContent = document.getElementById('dashboard-content');
    const loadingSection = document.getElementById('loading');
    const errorSection = document.getElementById('error-message');
    
    // Lưu trữ các biểu đồ đã tạo để xóa sau này
    let charts = {
        genreChart: null,
        keywordsChart: null,
        factorsChart: null
    };

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
    
    // Xóa toàn bộ biểu đồ đã tồn tại
    function resetCharts() {
        // Xóa các biểu đồ cũ nếu tồn tại
        if (charts.genreChart) {
            charts.genreChart.destroy();
            charts.genreChart = null;
        }
        
        if (charts.keywordsChart) {
            charts.keywordsChart.destroy();
            charts.keywordsChart = null;
        }
        
        if (charts.factorsChart) {
            charts.factorsChart.destroy();
            charts.factorsChart = null;
        }
        
        // Xóa nội dung container hiển thị phim
        const recommendationsContainer = document.getElementById('recommendations-grid');
        if (recommendationsContainer) {
            recommendationsContainer.innerHTML = '';
        }
        
        // Xóa nội dung insight text
        const insightElements = document.querySelectorAll('.insight-text');
        insightElements.forEach(element => {
            element.textContent = '';
        });
    }

    // Load user dashboard data and render
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
        loadingSection.classList.remove('hidden');
        
        // Xóa nội dung biểu đồ cũ trước khi tải dữ liệu mới
        resetCharts();
        
        // Fetch dashboard data
        ApiService.getUserDashboard(userId)
            .then(data => {
                // Hide loading and show content
                loadingSection.classList.add('hidden');
                dashboardContent.classList.remove('hidden');

                // Render dashboard components
                renderGenrePreferences(data.genre_preferences);
                renderContentKeywords(data.content_keywords);
                renderUserFactors(data.user_factors);
                renderRecommendations(data.recommendations);
            })
            .catch(error => {
                console.error('Error loading dashboard:', error);
                loadingSection.classList.add('hidden');
                errorSection.classList.remove('hidden');
            });
    }    function renderGenrePreferences(genrePreferences) {
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
        charts.genreChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107',
                        '#FF9800', '#FF5722', '#F44336', '#E91E63', '#9C27B0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Genre Distribution in Your Recommendations',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${(value * 100).toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });

        // Generate insight text
        const topGenres = labels.slice(0, 3).join(', ');
        document.getElementById('genre-insight').textContent = 
            `Based on your viewing history and hybrid recommendations, you seem to enjoy ${topGenres} movies the most. These genres appear most frequently in your personalized recommendations.`;
    }    

    function renderContentKeywords(contentKeywords) {
        // If no data, exit
        if (!contentKeywords || Object.keys(contentKeywords).length === 0) {
            document.getElementById('content-insight').textContent = 
                'No content keyword data available for this user.';
            return;
        }

        // Get the canvas and create chart
        const ctx = document.getElementById('content-keywords-chart').getContext('2d');
        
        // Prepare data for chart
        const labels = Object.keys(contentKeywords);
        const data = Object.values(contentKeywords);
        
        // Create word cloud-like bar chart for keywords
        charts.keywordsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: 'rgba(76, 175, 80, 0.5)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',  // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top Keywords from Content-Based Analysis',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                return `Relevance: ${(value * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Relevance Score'
                        }
                    }
                }
            }
        });

        // Generate insight text
        const topKeywords = labels.slice(0, 5).join(', ');
        document.getElementById('content-insight').textContent = 
            `Based on content analysis, keywords like "${topKeywords}" appear most frequently in movies recommended for you. These keywords help our system find movies with content similar to your preferences.`;
    }    function renderUserFactors(userFactors) {
        // If no data, exit
        if (!userFactors || userFactors.length === 0) return;

        // Get the canvas and create chart
        const ctx = document.getElementById('taste-profile-chart').getContext('2d');
        
        // Prepare data for chart
        const labels = userFactors.map(f => f.factor);
        const data = userFactors.map(f => f.value);
        
        // Create bar chart
        charts.factorsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Factor Influence',
                    data: data,
                    backgroundColor: 'rgba(33, 150, 243, 0.5)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Collaborative Filtering Latent Factors',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                return `Influence: ${context.raw.toFixed(4)}`;
                            },
                            afterLabel: function() {
                                return 'These represent patterns discovered by the collaborative filtering algorithm.';
                            }
                        }
                    },
                    legend: {
                        labels: {
                            text: 'Collaborative Filtering Factors'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Factor Influence'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Latent Factors'
                        }
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
