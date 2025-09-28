const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const API_BASE_URL = 'https://tmbd.22afed28-f0b2-46d0-8804-c90e25c90bd4.workers.dev';

let allMovies = []; // Store fetched movies for filtering

// Function to create movie card HTML
function createMovieCard(movie) {
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? (movie.vote_average / 10).toFixed(1) : 'N/A';
    const genreNames = movie.genre_ids ? movie.genre_ids.map(id => getGenreName(id)).join(', ') : 'N/A';
    
    return `
        <div class="movie-card" onclick="showMovieDetails(${movie.id})">
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

// Fetch popular movies (100 total from 5 pages) via proxy
async function fetchPopularMovies() {
    try {
        let allResults = [];
        for (let page = 1; page <= 5; page++) {
            const response = await fetch(`${API_BASE_URL}/api/popular?page=${page}`);
            if (!response.ok) {
                throw new Error('Proxy request failed');
            }
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

// Fetch search results via proxy
async function searchMovies(query) {
    if (query.length < 3) {
        populateMovies(allMovies); // Show popular if short query
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Proxy request failed');
        }
        const data = await response.json();
        populateMovies(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        document.getElementById('movieGrid').innerHTML = '<p>Error searching movies.</p>';
    }
}



// Movie Details Modal Functions
let currentMovieId = null;

async function showMovieDetails(movieId) {
    currentMovieId = movieId;
    const modal = document.getElementById('movieModal');
    const trailerIframe = document.getElementById('trailerIframe');
    const trailerSection = document.getElementById('trailerSection');
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');

    try {
        const response = await fetch(`${API_BASE_URL}/api/details?movie_id=${movieId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch movie details');
        }
        const { details, videos } = await response.json();

        // Populate details
        document.getElementById('modalTitle').textContent = details.title || 'Unknown Title';
        document.getElementById('modalOverview').textContent = details.overview || 'No overview available.';
        document.getElementById('modalPoster').src = details.poster_path ? IMAGE_BASE_URL + details.poster_path : 'https://via.placeholder.com/200x300?text=No+Image';
        const year = details.release_date ? details.release_date.split('-')[0] : 'N/A';
        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';
        const rating = details.vote_average ? (details.vote_average / 10).toFixed(1) : 'N/A';
        document.getElementById('modalInfo').textContent = `${year} | ${genres} | ${rating}`;

        // Handle trailer
        trailerIframe.style.display = 'none';
        const trailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (trailer) {
            trailerIframe.src = `https://www.youtube.com/embed/${trailer.key}`;
            trailerIframe.style.display = 'block';
        } else {
            trailerSection.innerHTML = '<h3>Trailer</h3><p>No trailer available.</p>';
        }

        // Reset streaming
        streamingSection.style.display = 'none';
        playButton.style.display = 'block';

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading movie details:', error);
        alert('Failed to load movie details.');
    }
}

function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.style.display = 'none';
}

function playMovie() {
    if (!currentMovieId) return;
    const trailerSection = document.getElementById('trailerSection');
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');
    const streamingIframe = document.getElementById('streamingIframe');

    trailerSection.style.display = 'none';
    playButton.style.display = 'none';
    streamingSection.style.display = 'block';
    streamingIframe.src = `https://vidrock.net/embed/movie/${currentMovieId}`;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');
    const modal = document.getElementById('movieModal');
    
    // Ensure modal is hidden initially
    modal.style.display = 'none';
    
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
});
