const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const API_BASE_URL = 'https://tmbd.22afed28-f0b2-46d0-8804-c90e25c90bd4.workers.dev';

let allContent = []; // Store fetched content for filtering
let currentType = 'movie'; // 'movie' or 'tv'
let currentSeason = 1;
let currentEpisode = 1;
let currentContentId = null;
let currentImdbId = null;
let seasons = [];
let episodes = [];

// Function to create content card HTML (works for both movies and TV)
function createContentCard(content) {
    const year = content.release_date ? content.release_date.split('-')[0] : (content.first_air_date ? content.first_air_date.split('-')[0] : 'N/A');
    const rating = content.vote_average ? (content.vote_average / 10).toFixed(1) : 'N/A';
    const genreNames = content.genre_ids ? content.genre_ids.map(id => getGenreName(id)).join(', ') : 'N/A';
    const title = content.title || content.name;
    const type = currentType;

    return `
        <div class="movie-card" onclick="showContentDetails(${content.id}, '${type}')">
            <img loading="lazy" src="${content.poster_path ? IMAGE_BASE_URL + content.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${title}">
            <h3>${title}</h3>
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

// Function to populate content grid
function populateContent(content) {
    const movieGrid = document.getElementById('movieGrid');
    if (!movieGrid) return;

    movieGrid.innerHTML = content.map(createContentCard).join('');
    allContent = content; // Update global for search
}

// Fetch popular content (movies or TV) via proxy
async function fetchPopularContent() {
    try {
        let allResults = [];
        const endpoint = currentType === 'movie' ? '/api/popular' : '/api/tv/popular';
        for (let page = 1; page <= 1; page++) {  // Reduced to 1 page for faster initial load
            const response = await fetch(`${API_BASE_URL}${endpoint}?page=${page}`);
            if (!response.ok) {
                throw new Error('Proxy request failed');
            }
            const data = await response.json();
            allResults = allResults.concat(data.results);
        }
        populateContent(allResults);
    } catch (error) {
        console.error(`Error fetching popular ${currentType}s:`, error);
        // Fallback to static if API fails
        document.getElementById('movieGrid').innerHTML = '<p>Unable to load content. Please check your connection.</p>';
    }
}

// Fetch search results via proxy
async function searchContent(query) {
    if (query.length < 3) {
        populateContent(allContent); // Show popular if short query
        return;
    }

    try {
        const endpoint = currentType === 'movie' ? '/api/search' : '/api/search/tv';
        const response = await fetch(`${API_BASE_URL}${endpoint}?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Proxy request failed');
        }
        const data = await response.json();
        populateContent(data.results);
    } catch (error) {
        console.error(`Error searching ${currentType}s:`, error);
        document.getElementById('movieGrid').innerHTML = '<p>Error searching content.</p>';
    }
}





// Show content details (movie or TV)
async function showContentDetails(contentId, type) {
    currentContentId = contentId;
    currentType = type;
    const modal = document.getElementById('movieModal');
    const trailerIframe = document.getElementById('trailerIframe');
    const trailerSection = document.getElementById('trailerSection');
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeSelect = document.getElementById('episodeSelect');

    try {
        const endpoint = type === 'movie' ? '/api/details' : '/api/tv/details';
        const param = type === 'movie' ? 'movie_id' : 'tv_id';
        const response = await fetch(`${API_BASE_URL}${endpoint}?${param}=${contentId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${type} details`);
        }
        const { details, videos } = await response.json();

        // Set IMDB ID for providers
        if (type === 'movie') {
            currentImdbId = details.imdb_id || null;
        } else {
            // For TV shows, get IMDB ID from external IDs
            const externalResponse = await fetch(`${API_BASE_URL}/api/tv/external?tv_id=${contentId}`);
            if (externalResponse.ok) {
                const externalData = await externalResponse.json();
                currentImdbId = externalData.imdb_id || null;
            }
        }

        // Populate details
        const title = details.title || details.name || 'Unknown Title';
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalOverview').textContent = details.overview || 'No overview available.';
        document.getElementById('modalPoster').src = details.poster_path ? IMAGE_BASE_URL + details.poster_path : 'https://via.placeholder.com/200x300?text=No+Image';
        const year = details.release_date ? details.release_date.split('-')[0] : (details.first_air_date ? details.first_air_date.split('-')[0] : 'N/A');
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

        // Handle seasons/episodes for TV shows
        if (type === 'tv') {
            // Load seasons
            const seasonsResponse = await fetch(`${API_BASE_URL}/api/seasons?tv_id=${contentId}`);
            if (seasonsResponse.ok) {
                seasons = await seasonsResponse.json();
                seasonSelect.innerHTML = seasons.map(season => `<option value="${season.season_number}">${season.name}</option>`).join('');
                seasonSelect.style.display = 'inline-block';
                episodeSelect.style.display = 'inline-block';
                // Load episodes for first season
                if (seasons.length > 0) {
                    await loadEpisodes(seasons[0].season_number);
                }
            }
        } else {
            seasonSelect.style.display = 'none';
            episodeSelect.style.display = 'none';
        }

        // Reset streaming
        streamingSection.style.display = 'none';
        playButton.style.display = 'block';

        // Set up provider change handler for automatic switching
        const providerSelect = document.getElementById('providerSelect');
        providerSelect.addEventListener('change', () => {
            const provider = providerSelect.value;
            const streamingIframe = document.getElementById('streamingIframe');
            if (streamingSection.style.display === 'block') {
                streamingIframe.src = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode);
            }
        });

        modal.style.display = 'block';
    } catch (error) {
        console.error(`Error loading ${type} details:`, error);
        alert(`Failed to load ${type} details.`);
    }
}

// Load episodes for a season
async function loadEpisodes(seasonNumber) {
    if (!currentContentId) return;
    const episodeSelect = document.getElementById('episodeSelect');

    try {
        const response = await fetch(`${API_BASE_URL}/api/episodes?tv_id=${currentContentId}&season=${seasonNumber}`);
        if (!response.ok) {
            throw new Error('Failed to fetch episodes');
        }
        episodes = await response.json();
        episodeSelect.innerHTML = episodes.map(episode => `<option value="${episode.episode_number}">Episode ${episode.episode_number}: ${episode.name}</option>`).join('');
        currentSeason = seasonNumber;
        currentEpisode = episodes.length > 0 ? episodes[0].episode_number : 1;
    } catch (error) {
        console.error('Error loading episodes:', error);
        episodeSelect.innerHTML = '<option>No episodes available</option>';
    }
}

function closeModal() {
    const modal = document.getElementById('movieModal');
    modal.style.display = 'none';
}

function getProviderUrl(provider, imdbId, contentId, type, season, episode) {
    const isTV = type === 'tv';
    const contentType = isTV ? 'tv' : 'movie';

    if (!imdbId) {
        // Fallback to TMDB ID for providers that support it
        if (isTV) {
            switch(provider) {
                case 'vidrockembed': return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/tv/${contentId}/${season}/${episode}`;
                case 'smashystream': return `https://smashy.stream/embed/tv/${contentId}/${season}/${episode}`;
                case 'embedsoap': return `https://www.embedsoap.com/embed/tv/${contentId}/${season}/${episode}`;
                default: return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}`;
            }
        } else {
            switch(provider) {
                case 'vidrockembed': return `https://vidrock.net/embed/movie/${contentId}`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/movie/${contentId}`;
                case 'smashystream': return `https://smashy.stream/embed/movie/${contentId}`;
                case 'embedsoap': return `https://www.embedsoap.com/embed/movie/${contentId}`;
                default: return `https://vidrock.net/embed/movie/${contentId}`;
            }
        }
    }

    if (isTV) {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1`;
            case 'vidrock': return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1`;
            case 'vidsrc': return `https://vidsrc.me/embed/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1`;
            case 'vidfast': return `https://vidfast.pro/tv/${imdbId}/${season}/${episode}?autoPlay=true&ads=0&disable_ads=1`;
            case 'autoembed': return `https://player.autoembed.cc/embed/tv/${imdbId}/${season}/${episode}`;
            case 'embedsu': return `https://embed.su/embed/tv/${imdbId}/${season}/${episode}`;
            case '111movies': return `https://111movies.com/tv/${imdbId}/${season}/${episode}`;
            case 'vidlink': return `https://vidlink.pro/tv/${imdbId}/${season}/${episode}`;
            case 'videasy': return `https://player.videasy.net/tv/${imdbId}/${season}/${episode}`;
            case 'vidsrcto': return `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
            default: return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1`;
        }
    } else {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/movie/${imdbId}?ads=0&disable_ads=1`;
            case 'vidrock': return `https://vidrock.net/movie/${imdbId}?ads=0&disable_ads=1`;
            case 'vidsrc': return `https://vidsrc.me/embed/movie/${imdbId}?ads=0&disable_ads=1`;
            case 'vidfast': return `https://vidfast.pro/movie/${imdbId}?autoPlay=true&ads=0&disable_ads=1`;
            case 'autoembed': return `https://player.autoembed.cc/embed/movie/${imdbId}`;
            case 'embedsu': return `https://embed.su/embed/movie/${imdbId}`;
            case '111movies': return `https://111movies.com/movie/${imdbId}`;
            case 'vidlink': return `https://vidlink.pro/movie/${imdbId}`;
            case 'videasy': return `https://player.videasy.net/movie/${imdbId}`;
            case 'vidsrcto': return `https://vidsrc.to/embed/movie/${imdbId}`;
            default: return `https://vidrock.net/movie/${imdbId}?ads=0&disable_ads=1`;
        }
    }
}

// Play content (movie or TV)
function playContent() {
    if (!currentContentId) return;
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');
    const streamingIframe = document.getElementById('streamingIframe');
    const providerSelect = document.getElementById('providerSelect');
    const refreshButton = document.getElementById('refreshButton');

    playButton.style.display = 'none';
    streamingSection.style.display = 'block';

    // Set initial provider
    streamingIframe.src = getProviderUrl('vidrock', currentImdbId, currentContentId, currentType, currentSeason, currentEpisode);

    // Provider change handler
    providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        streamingIframe.src = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode);
    });

    // Refresh handler
    refreshButton.addEventListener('click', () => {
        streamingIframe.src = streamingIframe.src;
    });
}

// Toggle between Movies and TV
function toggleType(type) {
    currentType = type;
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = type === 'movie' ? document.getElementById('movieToggle') : document.getElementById('tvToggle');
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    // Clear search and load popular
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

    // Theme toggle functionality
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
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

    // Ensure modal is hidden initially
    modal.style.display = 'none';

    // Set up toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleType(btn.dataset.type));
    });

    // Load popular content
    fetchPopularContent();

    // Search functionality
    function handleSearch() {
        const query = searchInput.value.trim();
        if (query) {
            searchContent(query);
        } else {
            fetchPopularContent();
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

    // Season and episode change handlers
    seasonSelect.addEventListener('change', async () => {
        const seasonNumber = parseInt(seasonSelect.value);
        await loadEpisodes(seasonNumber);
    });

    episodeSelect.addEventListener('change', () => {
        currentEpisode = parseInt(episodeSelect.value);
    });
});
