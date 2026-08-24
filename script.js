// Direct TMDB API - No Worker Required
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; // <- PUT YOUR ACTUAL TMDB API KEY HERE
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

let allContent = [];
let currentType = 'movie';
let currentSeason = 1;
let currentEpisode = 1;
let currentContentId = null;
let currentImdbId = null;
let currentTitle = null;
let seasons = [];
let episodes = [];

// Provider lists
const providersAlwaysAvailableMovie = ['vidora', 'vidrockembed', 'vidsrcpro', 'autoembedpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'xprime', 'vixsrc', 'rivestream', 'vidzee', '2embed', 'moviekex', 'vidpro', 'primesrc', 'moviesapi', 'frembed', 'uembed', 'warezcdn', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbMovie = ['vidsrccc', 'vidrock', 'autoembedpro', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];
const providersAlwaysAvailableTV = ['vidora', 'vidrockembed', 'vidsrcpro', 'autoembedpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'vixsrc', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbTV = ['vidsrccc', 'vidrock', 'autoembedpro', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];

// Format rating - shows out of 10 with one decimal
function formatRating(voteAverage) {
    if (!voteAverage || voteAverage === 0) return 'N/A';
    const rating = (voteAverage / 10 * 10).toFixed(1);
    return `${rating}/10 ⭐`;
}

// Create content card with better rating display
function createContentCard(content) {
    const year = content.release_date ? content.release_date.split('-')[0] : (content.first_air_date ? content.first_air_date.split('-')[0] : 'N/A');
    const rating = content.vote_average ? formatRating(content.vote_average) : 'N/A';
    const genreNames = content.genre_ids ? content.genre_ids.map(id => getGenreName(id)).slice(0, 2).join(', ') : 'N/A';
    const title = content.title || content.name;
    const type = content.title ? 'movie' : 'tv';

    return `
        <div class="movie-card" onclick="showContentDetails(${content.id}, '${type}')">
            <img src="${content.poster_path ? IMAGE_BASE_URL + content.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${title}" loading="lazy">
            <h3>${title}</h3>
            <p>${year} · ${genreNames} · <span class="rating-star">${rating}</span></p>
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
    const contentCount = document.getElementById('contentCount');
    if (!movieGrid) return;
    
    if (!content || content.length === 0) {
        movieGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary);">No content available. Please try again later.</p>';
        if (contentCount) contentCount.textContent = '';
        return;
    }
    
    movieGrid.innerHTML = content.map(createContentCard).join('');
    allContent = content;
    if (contentCount) contentCount.textContent = `${content.length} titles`;
}

// Fetch with timeout
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

// Fetch popular content directly from TMDB
async function fetchPopularContent() {
    const movieGrid = document.getElementById('movieGrid');
    const contentCount = document.getElementById('contentCount');
    movieGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary);">Loading content...</p>';
    if (contentCount) contentCount.textContent = 'Loading...';
    
    try {
        // Check if API key is set
        if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
            movieGrid.innerHTML = `
                <div style="text-align:center;padding:40px;color:#e74c3c;">
                    <p>⚠️ TMDB API Key not configured</p>
                    <p style="font-size:0.9em;color:var(--text-secondary);">Please add your TMDB API key to script.js</p>
                </div>
            `;
            if (contentCount) contentCount.textContent = '';
            return;
        }

        console.log('Fetching from TMDB API...');
        
        let allResults = [];
        if (currentType === 'all') {
            const [movieResponse, tvResponse] = await Promise.all([
                fetchWithTimeout(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
                fetchWithTimeout(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
            ]);
            
            if (!movieResponse.ok) throw new Error(`Movie API returned ${movieResponse.status}`);
            if (!tvResponse.ok) throw new Error(`TV API returned ${tvResponse.status}`);
            
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();
            allResults = [...(movieData.results || []), ...(tvData.results || [])];
        } else {
            const endpoint = currentType === 'movie' ? 'movie/popular' : 'tv/popular';
            const response = await fetchWithTimeout(`${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
            
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            
            const data = await response.json();
            allResults = data.results || [];
        }
        
        populateContent(allResults);
    } catch (error) {
        console.error('Error fetching content:', error);
        movieGrid.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-secondary);">
                <p>❌ Unable to load content</p>
                <p style="font-size:0.9em;color:var(--text-light);">${error.message}</p>
                <button onclick="fetchPopularContent()" style="margin-top:16px;padding:12px 28px;background:var(--primary);color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem;min-height:44px;">
                    🔄 Retry
                </button>
            </div>
        `;
        if (contentCount) contentCount.textContent = '';
    }
}

// Search content directly from TMDB
async function searchContent(query) {
    if (query.length < 3) {
        fetchPopularContent();
        return;
    }
    
    const movieGrid = document.getElementById('movieGrid');
    const contentCount = document.getElementById('contentCount');
    movieGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary);">Searching...</p>';
    if (contentCount) contentCount.textContent = 'Searching...';
    
    try {
        const [movieResponse, tvResponse] = await Promise.all([
            fetchWithTimeout(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`),
            fetchWithTimeout(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`)
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
        movieGrid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-secondary);">Error searching content. Please try again.</p>';
        if (contentCount) contentCount.textContent = '';
    }
}

// Show content details with better rating display
async function showContentDetails(contentId, type) {
    currentContentId = contentId;
    currentType = type;
    const modal = document.getElementById('movieModal');
    const trailerIframe = document.getElementById('trailerIframe');
    const trailerSection = document.getElementById('trailerSection');
    const noTrailerMsg = document.getElementById('noTrailerMsg');
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeSelect = document.getElementById('episodeSelect');

    try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const detailsUrl = `${TMDB_BASE_URL}/${endpoint}/${contentId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const videosUrl = `${TMDB_BASE_URL}/${endpoint}/${contentId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        
        const [detailsRes, videosRes] = await Promise.all([
            fetchWithTimeout(detailsUrl),
            fetchWithTimeout(videosUrl)
        ]);
        
        if (!detailsRes.ok || !videosRes.ok) {
            throw new Error(`Failed to fetch ${type} details`);
        }
        
        const details = await detailsRes.json();
        const videos = await videosRes.json();

        if (type === 'movie') {
            currentImdbId = details.imdb_id || null;
        } else {
            const externalRes = await fetchWithTimeout(`${TMDB_BASE_URL}/tv/${contentId}/external_ids?api_key=${TMDB_API_KEY}`);
            if (externalRes.ok) {
                const externalData = await externalRes.json();
                currentImdbId = externalData.imdb_id || null;
            }
        }

        // Populate provider select
        const providerSelect = document.getElementById('providerSelect');
        providerSelect.innerHTML = '';
        let availableProviders = type === 'tv' ? [...providersAlwaysAvailableTV] : [...providersAlwaysAvailableMovie];
        if (currentImdbId) {
            availableProviders.push(...(type === 'tv' ? providersRequiringImdbTV : providersRequiringImdbMovie));
        }
        availableProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/([A-Z])/g, ' $1');
            providerSelect.appendChild(option);
        });
        if (availableProviders.length > 0) providerSelect.value = availableProviders[0];

        // Populate details
        const title = details.title || details.name || 'Unknown Title';
        currentTitle = title;
        document.getElementById('modalTitle').textContent = title;
        
        // Rating with stars
        const rating = details.vote_average ? formatRating(details.vote_average) : 'N/A';
        document.getElementById('modalRating').innerHTML = `⭐ ${rating}`;
        
        document.getElementById('modalOverview').textContent = details.overview || 'No overview available.';
        
        const posterElement = document.getElementById('modalPoster');
        const posterUrl = details.poster_path ? IMAGE_BASE_URL + details.poster_path : 'https://via.placeholder.com/300x450?text=No+Image';
        posterElement.src = posterUrl;

        const year = details.release_date ? details.release_date.split('-')[0] : (details.first_air_date ? details.first_air_date.split('-')[0] : 'N/A');
        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';
        const runtime = details.runtime ? ` · ${details.runtime} min` : '';
        document.getElementById('modalInfo').textContent = `${year} · ${genres}${runtime}`;

        // Handle trailer
        trailerIframe.style.display = 'none';
        noTrailerMsg.style.display = 'none';
        let trailer = videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (!trailer) trailer = videos.results.find(v => v.site === 'YouTube');
        if (trailer) {
            trailerIframe.src = `https://www.youtube.com/embed/${trailer.key}`;
            trailerIframe.style.display = 'block';
        } else {
            noTrailerMsg.style.display = 'block';
        }

        // Handle seasons/episodes for TV shows
        if (type === 'tv') {
            const seasonsRes = await fetchWithTimeout(`${TMDB_BASE_URL}/tv/${contentId}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (seasonsRes.ok) {
                const tvData = await seasonsRes.json();
                seasons = tvData.seasons || [];
                seasonSelect.innerHTML = seasons.map(season => `<option value="${season.season_number}">${season.name}</option>`).join('');
                seasonSelect.style.display = 'inline-block';
                episodeSelect.style.display = 'inline-block';
                if (seasons.length > 0) await loadEpisodes(seasons[0].season_number);
            }
        } else {
            seasonSelect.style.display = 'none';
            episodeSelect.style.display = 'none';
        }

        streamingSection.style.display = 'none';
        playButton.style.display = 'block';

        providerSelect.addEventListener('change', () => {
            const provider = providerSelect.value;
            const streamingIframe = document.getElementById('streamingIframe');
            if (streamingSection.style.display === 'block') {
                streamingIframe.src = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode);
            }
        });

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error(`Error loading ${type} details:`, error);
        alert(`Failed to load ${type} details. Please try again.`);
    }
}

// Load episodes
async function loadEpisodes(seasonNumber) {
    if (!currentContentId) return;
    const episodeSelect = document.getElementById('episodeSelect');
    try {
        const response = await fetchWithTimeout(`${TMDB_BASE_URL}/tv/${currentContentId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (!response.ok) throw new Error('Failed to fetch episodes');
        const data = await response.json();
        episodes = data.episodes || [];
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
    const streamingIframe = document.getElementById('streamingIframe');
    streamingIframe.src = '';
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Error exiting fullscreen:', err));
    }
}

function slugifyTitle(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getProviderUrl(provider, imdbId, contentId, type, season, episode) {
    const isTV = type === 'tv';
    if (!imdbId) {
        if (isTV) {
            switch(provider) {
                case 'vidora': return `https://vidora.su/tv/${contentId}/${season}/${episode}?colour=1100ff&autoplay=true`;
                case 'vidrockembed': return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'smashystream': return `https://smashy.stream/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'embedsoap': return `https://www.embedsoap.com/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'vidplus': return `https://player.vidplus.to/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'vidking': return `https://www.vidking.net/embed/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'vixsrc': return `https://vixsrc.to/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'videasy': return `https://player.videasy.net/tv/${contentId}/${season}/${episode}?ads=0`;
                case 'moviemaze': return `https://moviemaze.cc/watch/tv/${contentId}?ads=0`;
                case '123moviesfree': return `https://ww7.123moviesfree.net/season/${slugifyTitle(currentTitle)}-season-${season}-${contentId}/?ads=0`;
                default: return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}?ads=0`;
            }
        } else {
            switch(provider) {
                case 'vidora': return `https://vidora.su/movie/${contentId}?colour=1100ff&autoplay=true`;
                case 'vidrockembed': return `https://vidrock.net/embed/movie/${contentId}?ads=0`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/movie/${contentId}?ads=0`;
                case 'smashystream': return `https://smashy.stream/embed/movie/${contentId}?ads=0`;
                case 'embedsoap': return `https://www.embedsoap.com/embed/movie/${contentId}?ads=0`;
                case 'vidplus': return `https://player.vidplus.to/embed/movie/${contentId}?ads=0`;
                case 'vidking': return `https://www.vidking.net/embed/movie/${contentId}?ads=0`;
                case 'xprime': return `https://xprime.tv/watch/${contentId}?ads=0`;
                case 'vixsrc': return `https://vixsrc.to/movie/${contentId}?ads=0`;
                case 'rivestream': return `https://rivestream.org/embed?type=movie&id=${contentId}&sendMetadata=true&ads=0`;
                case 'vidzee': return `https://player.vidzee.wtf/embed/movie/${contentId}?ads=0`;
                case '2embed': return `https://www.2embed.stream/embed/movie/${contentId}?ads=0`;
                case 'moviekex': return `https://moviekex.online/embed/movie/${contentId}?ads=0`;
                case 'vidpro': return `https://player.vidpro.top/embed/movie/${contentId}?ads=0`;
                case 'primesrc': return `https://primesrc.me/embed/movie?imdb=${contentId}&fallback=true&server_order=PrimeVid,Voe,Dood&ads=0`;
                case 'moviesapi': return `https://moviesapi.club/movie/${contentId}?ads=0`;
                case 'frembed': return `https://frembed.lat/api/film.php?id=${contentId}&ads=0`;
                case 'uembed': return `http://uembed.xyz/embed/movie/?id=${contentId}&ads=0`;
                case 'warezcdn': return `https://embed.warezcdn.com/filme/${contentId}?ads=0`;
                case 'videasy': return `https://player.videasy.net/movie/${contentId}?ads=0`;
                case 'moviemaze': return `https://moviemaze.cc/watch/movie/${contentId}?ads=0`;
                case '123moviesfree': return `https://ww7.123moviesfree.net/movie/${slugifyTitle(currentTitle)}-${contentId}/?ads=0`;
                default: return `https://vidrock.net/embed/movie/${contentId}?ads=0`;
            }
        }
    }
    if (isTV) {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidrock': return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidsrc': return `https://vidsrc.me/embed/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidfast': return `https://vidfast.pro/tv/${imdbId}/${season}/${episode}?autoPlay=true&ads=0`;
            case 'autoembed': return `https://player.autoembed.cc/embed/tv/${contentId}/${season}/${episode}?server=2&ads=0`;
            case 'embedsu': return `https://moviemaze.cc/watch/tv/${contentId}/${season}/${episode}?ads=0`;
            case '111movies': return `https://111movies.com/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidlink': return `https://vidlink.pro/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'videasy': return `https://player.videasy.net/tv/${contentId}/${season}/${episode}?ads=0`;
            case 'vidsrcto': return `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'solarmovies': return `https://solarmovies.ms/watch-tv/watch-${slugifyTitle(currentTitle)}-free-${contentId}.${imdbId}?ads=0`;
            case 'freehdmovies': return `https://freehdmovies.to/watch-tv/watch-${slugifyTitle(currentTitle)}-full-${contentId}.${imdbId}?ads=0`;
            default: return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0`;
        }
    } else {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/movie/${imdbId}?ads=0`;
            case 'vidrock': return `https://vidrock.net/movie/${imdbId}?ads=0`;
            case 'vidsrc': return `https://vidsrc.me/embed/movie/${imdbId}?ads=0`;
            case 'vidfast': return `https://vidfast.pro/movie/${imdbId}?autoPlay=true&ads=0`;
            case 'autoembed': return `https://player.autoembed.cc/embed/movie/${imdbId}?server=2&ads=0`;
            case 'embedsu': return `https://moviemaze.cc/watch/movie/${contentId}?ads=0`;
            case '111movies': return `https://111movies.com/movie/${imdbId}?ads=0`;
            case 'vidlink': return `https://vidlink.pro/movie/${imdbId}?ads=0`;
            case 'videasy': return `https://player.videasy.net/movie/${contentId}?ads=0`;
            case 'vidsrcto': return `https://vidsrc.to/embed/movie/${imdbId}?ads=0`;
            case 'solarmovies': return `https://solarmovies.ms/watch-movie/watch-${slugifyTitle(currentTitle)}-free-${contentId}.${imdbId}?ads=0`;
            case 'freehdmovies': return `https://freehdmovies.to/watch-movie/watch-${slugifyTitle(currentTitle)}-full-${contentId}.${imdbId}?ads=0`;
            default: return `https://vidrock.net/movie/${imdbId}?ads=0`;
        }
    }
}

// Play content with streaming
function playContent() {
    if (!currentContentId) {
        alert('No content selected');
        return;
    }
    
    const playButton = document.getElementById('playButton');
    const streamingSection = document.getElementById('streamingSection');
    const streamingIframe = document.getElementById('streamingIframe');
    const providerSelect = document.getElementById('providerSelect');

    playButton.style.display = 'none';
    streamingSection.style.display = 'block';
    
    setTimeout(() => {
        streamingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const provider = providerSelect.value;
    const providerUrl = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode);
    
    if (!providerUrl) {
        alert('No streaming source available for this content');
        return;
    }

    streamingIframe.src = providerUrl;
    streamingIframe.style.display = 'block';

    if (streamingIframe.requestFullscreen) {
        streamingIframe.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    }

    streamingIframe.onerror = function() {
        alert('This provider is currently unavailable. Please try another provider from the dropdown.');
    };
}

// Refresh the current stream
function refreshStream() {
    const streamingIframe = document.getElementById('streamingIframe');
    const currentSrc = streamingIframe.src;
    if (!currentSrc) {
        alert('No stream is currently playing');
        return;
    }
    streamingIframe.src = '';
    setTimeout(() => {
        streamingIframe.src = currentSrc;
    }, 100);
}

// Toggle between All, Movies and TV
function toggleType(type) {
    currentType = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById(type === 'all' ? 'allToggle' : type === 'movie' ? 'movieToggle' : 'tvToggle');
    if (activeBtn) activeBtn.classList.add('active');
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) searchInput.value = '';
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
    const refreshButton = document.getElementById('refreshButton');
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

    if (refreshButton) {
        refreshButton.addEventListener('click', refreshStream);
    }

    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});