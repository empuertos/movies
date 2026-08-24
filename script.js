// Updated script.js with proper error handling
const API_BASE_URL = 'https://movies.22afed28-f0b2-46d0-8804-c90e25c90bd4.workers.dev';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

let allContent = [];
let currentType = 'movie';
let currentSeason = 1;
let currentEpisode = 1;
let currentContentId = null;
let currentImdbId = null;
let currentTitle = null;
let seasons = [];
let episodes = [];

// Create content card
function createContentCard(content) {
    const year = content.release_date ? content.release_date.split('-')[0] : (content.first_air_date ? content.first_air_date.split('-')[0] : 'N/A');
    const rating = content.vote_average ? (content.vote_average / 10).toFixed(1) : 'N/A';
    const genreNames = content.genre_ids ? content.genre_ids.map(id => getGenreName(id)).join(', ') : 'N/A';
    const title = content.title || content.name;
    const type = content.title ? 'movie' : 'tv';

    return `
        <div class="movie-card" onclick="showContentDetails(${content.id}, '${type}')">
            <img src="${content.poster_path ? IMAGE_BASE_URL + content.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${title}" loading="lazy">
            <h3>${title}</h3>
            <p>${year} | ${genreNames} | ${rating}</p>
        </div>
    `;
}

function getGenreName(genreId) {
    const genres = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
        53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    return genres[genreId] || 'Other';
}

function populateContent(content) {
    const movieGrid = document.getElementById('movieGrid');
    if (!movieGrid) return;
    
    if (!content || content.length === 0) {
        movieGrid.innerHTML = '<p style="text-align:center;padding:20px;">No content available. Please try again later.</p>';
        return;
    }
    
    movieGrid.innerHTML = content.map(createContentCard).join('');
    allContent = content;
}

// Fetch with timeout and better error handling
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

// Fetch popular content with detailed error logging
async function fetchPopularContent() {
    const movieGrid = document.getElementById('movieGrid');
    movieGrid.innerHTML = '<p style="text-align:center;padding:20px;">Loading content...</p>';
    
    try {
        console.log('Fetching from:', API_BASE_URL);
        
        let allResults = [];
        if (currentType === 'all') {
            const [movieResponse, tvResponse] = await Promise.all([
                fetchWithTimeout(`${API_BASE_URL}/api/popular?page=1`),
                fetchWithTimeout(`${API_BASE_URL}/api/tv/popular?page=1`)
            ]);
            
            if (!movieResponse.ok) {
                throw new Error(`Movie API returned ${movieResponse.status}`);
            }
            if (!tvResponse.ok) {
                throw new Error(`TV API returned ${tvResponse.status}`);
            }
            
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();
            allResults = [...(movieData.results || []), ...(tvData.results || [])];
        } else {
            const endpoint = currentType === 'movie' ? '/api/popular' : '/api/tv/popular';
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}?page=1`);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            allResults = data.results || [];
        }
        
        populateContent(allResults);
    } catch (error) {
        console.error('Error fetching content:', error);
        movieGrid.innerHTML = `
            <div style="text-align:center;padding:20px;color:#666;">
                <p>Unable to load content.</p>
                <p style="font-size:0.9em;color:#999;">Error: ${error.message}</p>
                <button onclick="fetchPopularContent()" style="margin-top:10px;padding:10px 20px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Search content
async function searchContent(query) {
    if (query.length < 3) {
        fetchPopularContent();
        return;
    }
    
    const movieGrid = document.getElementById('movieGrid');
    movieGrid.innerHTML = '<p style="text-align:center;padding:20px;">Searching...</p>';
    
    try {
        const [movieResponse, tvResponse] = await Promise.all([
            fetchWithTimeout(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`),
            fetchWithTimeout(`${API_BASE_URL}/api/search/tv?query=${encodeURIComponent(query)}`)
        ]);
        
        if (!movieResponse.ok || !tvResponse.ok) {
            throw new Error('Search request failed');
        }
        
        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();
        const results = [...(movieData.results || []), ...(tvData.results || [])];
        populateContent(results);
    } catch (error) {
        console.error('Error searching:', error);
        movieGrid.innerHTML = '<p style="text-align:center;padding:20px;">Error searching content. Please try again.</p>';
    }
}

// Show content details (keep your existing function)
async function showContentDetails(contentId, type) {
    // ... (keep your existing implementation)
}

// Close modal (keep your existing function)
function closeModal() {
    // ... (keep your existing implementation)
}

// Play content (keep your existing function)
function playContent() {
    // ... (keep your existing implementation)
}

// Toggle between All, Movies and TV
function toggleType(type) {
    currentType = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById(type === 'all' ? 'allToggle' : type === 'movie' ? 'movieToggle' : 'tvToggle');
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelector('.search-bar input').value = '';
    fetchPopularContent();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');
    const modal = document.getElementById('movieModal');
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeSelect = document.getElementById('episodeSelect');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Theme toggle
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    }

    function toggleTheme() {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    initTheme();
    themeToggle.addEventListener('click', toggleTheme);

    modal.style.display = 'none';

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleType(btn.dataset.type));
    });

    fetchPopularContent();

    function handleSearch() {
        const query = searchInput.value.trim();
        if (query) {
            searchContent(query);
        } else {
            fetchPopularContent();
        }
    }

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    seasonSelect.addEventListener('change', async () => {
        const seasonNumber = parseInt(seasonSelect.value);
        await loadEpisodes(seasonNumber);
    });

    episodeSelect.addEventListener('change', () => {
        currentEpisode = parseInt(episodeSelect.value);
    });
});