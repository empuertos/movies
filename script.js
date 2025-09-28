const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let allMovies = []; // Store fetched movies for filtering

// Function to create movie card HTML
function createMovieCard(movie) {
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? (movie.vote_average / 10).toFixed(1) : 'N/A';
    const genreNames = movie.genre_ids ? movie.genre_ids.map(id => getGenreName(id)).join(', ') : 'N/A';
    
    return `
        <div class="movie-card">
            <img src="${movie.poster_path ? IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <p>${year} | ${genreNames} | ${rating}</p>
        </div>
    `;
}

// Simple genre mapping (TMDB genre IDs)
function getGenreName(genreId) {
    const genres = {
        28: 'Action',
        12: 'Adventure',
        16: 'Animation',
        35: 'Comedy',
        80: 'Crime',
        99: 'Documentary',
        18: 'Drama',
        10751: 'Family',
        14: 'Fantasy',
        36: 'History',
        27: 'Horror',
        10402: 'Music',
        9648: 'Mystery',
        10749: 'Romance',
        878: 'Sci-Fi',
        10770: 'TV Movie',
        53: 'Thriller',
        10752: 'War',
        37: 'Western'
    };
    return genres[genreId] || 'Other';
}

// Function to populate movie grid
function populateMovies(movies) {
    const movieGrid = document.getElementById('movieGrid');
    if (!movieGrid) return;
    
    movieGrid.innerHTML = movies.map(createMovieCard).join('');
    allMovies = movies; // Update global for search
}

// Fetch popular movies (100 total from 5 pages)
async function fetchPopularMovies() {
    try {
        let allResults = [];
        for (let page = 1; page <= 5; page++) {
            const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
            const data = await response.json();
            allResults = allResults.concat(data.results);
        }
        populateMovies(allResults);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        // Fallback to static if API fails
        document.getElementById('movieGrid').innerHTML = '<p>Unable to load movies. Please check your connection.</p>';
    }
}

// Fetch search results
async function searchMovies(query) {
    if (query.length < 3) {
        populateMovies(allMovies); // Show popular if short query
        return;
    }
    
    try {
        const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        populateMovies(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        document.getElementById('movieGrid').innerHTML = '<p>Error searching movies.</p>';
    }
}

// Smooth scrolling for nav links
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');
    
    // Load popular movies
    fetchPopularMovies();
    
    // Search functionality
    function handleSearch() {
        const query = searchInput.value.trim();
        if (query) {
            searchMovies(query);
        } else {
            fetchPopularMovies();
        }
    }
    
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearch); // Real-time search
    
    // Enter key support
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    setupNavigation();
});
