const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

const API_BASE_URL = 'https://tmbd.22afed28-f0b2-46d0-8804-c90e25c90bd4.workers.dev';

let allContent = []; // Store fetched content for filtering
let currentType = 'movie'; // 'all', 'movie' or 'tv'
let currentSeason = 1;
let currentEpisode = 1;
let currentContentId = null;
let currentImdbId = null;
let currentTitle = null;
let seasons = [];
let episodes = [];

// Provider lists
const providersAlwaysAvailableMovie = ['vidrockembed', 'vidsrcpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'xprime', 'vixsrc', 'rivestream', 'vidzee', '2embed', 'moviekex', 'vidpro', 'primesrc', 'moviesapi', 'frembed', 'uembed', 'warezcdn', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbMovie = ['vidsrccc', 'vidrock', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];
const providersAlwaysAvailableTV = ['vidrockembed', 'vidsrcpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'vixsrc', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbTV = ['vidsrccc', 'vidrock', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];

// Function to create content card HTML (works for both movies and TV)
function createContentCard(content) {
    const year = content.release_date ? content.release_date.split('-')[0] : (content.first_air_date ? content.first_air_date.split('-')[0] : 'N/A');
    const rating = content.vote_average ? (content.vote_average / 10).toFixed(1) : 'N/A';
    const genreNames = content.genre_ids ? content.genre_ids.map(id => getGenreName(id)).join(', ') : 'N/A';
    const title = content.title || content.name;
    const type = content.title ? 'movie' : 'tv';

    return `
        <div class="movie-card" onclick="showContentDetails(${content.id}, '${type}')">
            <img src="${content.poster_path ? IMAGE_BASE_URL + content.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${title}">
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
        if (currentType === 'all') {
            const movieResponse = await fetch(`${API_BASE_URL}/api/popular?page=1`);
            const tvResponse = await fetch(`${API_BASE_URL}/api/tv/popular?page=1`);
            if (!movieResponse.ok || !tvResponse.ok) {
                throw new Error('Proxy request failed');
            }
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();
            allResults = movieData.results.concat(tvData.results);
        } else {
            const endpoint = currentType === 'movie' ? '/api/popular' : '/api/tv/popular';
            if (currentType === 'movie') {
                allResults = [];
                for (let page = 1; page <= 5; page++) {
                    const response = await fetch(`${API_BASE_URL}${endpoint}?page=${page}`);
                    if (!response.ok) {
                        throw new Error('Proxy request failed');
                    }
                    const data = await response.json();
                    allResults = allResults.concat(data.results);
                }
            } else {
                const response = await fetch(`${API_BASE_URL}${endpoint}?page=1`);
                if (!response.ok) {
                    throw new Error('Proxy request failed');
                }
                const data = await response.json();
                allResults = data.results;
            }
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
        // Fetch both movie and TV search results concurrently
        const movieResponsePromise = fetch(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`);
        const tvResponsePromise = fetch(`${API_BASE_URL}/api/search/tv?query=${encodeURIComponent(query)}`);

        const [movieResponse, tvResponse] = await Promise.all([movieResponsePromise, tvResponsePromise]);

        if (!movieResponse.ok || !tvResponse.ok) {
            throw new Error('Proxy request failed');
        }

        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();

        // Combine results from both movie and TV
        const combinedResults = [...movieData.results, ...tvData.results];

        populateContent(combinedResults);
    } catch (error) {
        console.error('Error searching movies and TV shows:', error);
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

        // Populate provider select based on availability
        const providerSelect = document.getElementById('providerSelect');
        providerSelect.innerHTML = '';
        let availableProviders = type === 'tv' ? [...providersAlwaysAvailableTV] : [...providersAlwaysAvailableMovie];
        if (currentImdbId) {
            availableProviders.push(... (type === 'tv' ? providersRequiringImdbTV : providersRequiringImdbMovie));
        }
        availableProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/([A-Z])/g, ' $1');
            providerSelect.appendChild(option);
        });
        // Set default provider
        if (availableProviders.length > 0) {
            providerSelect.value = availableProviders[0];
        }

        // Populate details
        const title = details.title || details.name || 'Unknown Title';
        currentTitle = title;
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalOverview').textContent = details.overview || 'No overview available.';
        // Handle poster caching
        const posterElement = document.getElementById('modalPoster');
        const posterKey = `poster_${contentId}`;
        const cachedPoster = localStorage.getItem(posterKey);
        if (cachedPoster) {
            posterElement.src = cachedPoster;
        } else {
            const posterUrl = details.poster_path ? IMAGE_BASE_URL + details.poster_path : 'https://via.placeholder.com/200x300?text=No+Image';
            posterElement.src = posterUrl;
            // Cache the poster
            if (details.poster_path) {
                fetch(posterUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            localStorage.setItem(posterKey, reader.result);
                        };
                        reader.readAsDataURL(blob);
                    })
                    .catch(err => console.log('Failed to cache poster:', err));
            }
        }
        const year = details.release_date ? details.release_date.split('-')[0] : (details.first_air_date ? details.first_air_date.split('-')[0] : 'N/A');
        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';
        const rating = details.vote_average ? (details.vote_average / 10).toFixed(1) : 'N/A';
        document.getElementById('modalInfo').textContent = `${year} | ${genres} | ${rating}`;

        // Handle trailer
        trailerIframe.style.display = 'none';
        let trailer = videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (!trailer) {
            trailer = videos.results.find(v => v.site === 'YouTube');
        }
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
    const streamingIframe = document.getElementById('streamingIframe');
    // Stop the video/audio by clearing the src
    streamingIframe.src = '';
    modal.style.display = 'none';
    // Exit fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Error exiting fullscreen:', err));
    }
}

function slugifyTitle(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getProviderUrl(provider, imdbId, contentId, type, season, episode, language = 'en') {
    const isTV = type === 'tv';
    const contentType = isTV ? 'tv' : 'movie';

    if (!imdbId) {
        // Fallback to TMDB ID for providers that support it
        if (isTV) {
        switch(provider) {
            case 'vidrockembed': return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidsrcpro': return `https://vidsrc.pro/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'smashystream': return `https://smashy.stream/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'embedsoap': return `https://www.embedsoap.com/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidplus': return `https://player.vidplus.to/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidking': return `https://www.vidking.net/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vixsrc': return `https://vixsrc.to/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'videasy': return `https://player.videasy.net/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'moviemaze': return `https://moviemaze.cc/watch/tv/${contentId}?ads=0&disable_ads=1&lang=${language}`;
            case '123moviesfree': return `https://ww7.123moviesfree.net/season/${slugifyTitle(currentTitle)}-season-${season}-${contentId}/?ads=0&disable_ads=1&lang=${language}`;
            default: return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
        }
        } else {
            switch(provider) {
                case 'vidrockembed': return `https://vidrock.net/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'smashystream': return `https://smashy.stream/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'embedsoap': return `https://www.embedsoap.com/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'vidplus': return `https://player.vidplus.to/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'vidking': return `https://www.vidking.net/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'xprime': return `https://xprime.tv/watch/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'vixsrc': return `https://vixsrc.to/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'rivestream': return `https://rivestream.org/embed?type=movie&id=${contentId}&sendMetadata=true&ads=0&disable_ads=1&lang=${language}`;
                case 'vidzee': return `https://player.vidzee.wtf/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case '2embed': return `https://www.2embed.stream/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'moviekex': return `https://moviekex.online/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'vidpro': return `https://player.vidpro.top/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'primesrc': return `https://primesrc.me/embed/movie?imdb=${contentId}&fallback=true&server_order=PrimeVid,Voe,Dood&ads=0&disable_ads=1&lang=${language}`;
                case 'moviesapi': return `https://moviesapi.club/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'frembed': return `https://frembed.lat/api/film.php?id=${contentId}&ads=0&disable_ads=1&lang=${language}`;
                case 'uembed': return `http://uembed.xyz/embed/movie/?id=${contentId}&ads=0&disable_ads=1&lang=${language}`;
                case 'warezcdn': return `https://embed.warezcdn.com/filme/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'videasy': return `https://player.videasy.net/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case 'moviemaze': return `https://moviemaze.cc/watch/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
                case '123moviesfree': return `https://ww7.123moviesfree.net/movie/${slugifyTitle(currentTitle)}-${contentId}/?ads=0&disable_ads=1&lang=${language}`;
                default: return `https://vidrock.net/embed/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
            }
        }
    }

    if (isTV) {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidrock': return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidsrc': return `https://vidsrc.me/embed/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidfast': return `https://vidfast.pro/tv/${imdbId}/${season}/${episode}?autoPlay=true&ads=0&disable_ads=1&lang=${language}`;
            case 'autoembed': return `https://player.autoembed.cc/embed/tv/${contentId}/${season}/${episode}?server=2&ads=0&disable_ads=1&lang=${language}`;
            case 'embedsu': return `https://moviemaze.cc/watch/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case '111movies': return `https://111movies.com/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidlink': return `https://vidlink.pro/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'videasy': return `https://player.videasy.net/tv/${contentId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidsrcto': return `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
            case 'solarmovies': return `https://solarmovies.ms/watch-tv/watch-${slugifyTitle(currentTitle)}-free-${contentId}.${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'freehdmovies': return `https://freehdmovies.to/watch-tv/watch-${slugifyTitle(currentTitle)}-full-${contentId}.${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            default: return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0&disable_ads=1&lang=${language}`;
        }
    } else {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidrock': return `https://vidrock.net/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidsrc': return `https://vidsrc.me/embed/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidfast': return `https://vidfast.pro/movie/${imdbId}?autoPlay=true&ads=0&disable_ads=1&lang=${language}`;
            case 'autoembed': return `https://player.autoembed.cc/embed/movie/${imdbId}?server=2&ads=0&disable_ads=1&lang=${language}`;
            case 'embedsu': return `https://moviemaze.cc/watch/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
            case '111movies': return `https://111movies.com/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidlink': return `https://vidlink.pro/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'videasy': return `https://player.videasy.net/movie/${contentId}?ads=0&disable_ads=1&lang=${language}`;
            case 'vidsrcto': return `https://vidsrc.to/embed/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'solarmovies': return `https://solarmovies.ms/watch-movie/watch-${slugifyTitle(currentTitle)}-free-${contentId}.${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            case 'freehdmovies': return `https://freehdmovies.to/watch-movie/watch-${slugifyTitle(currentTitle)}-full-${contentId}.${imdbId}?ads=0&disable_ads=1&lang=${language}`;
            default: return `https://vidrock.net/movie/${imdbId}?ads=0&disable_ads=1&lang=${language}`;
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
    const languageSelect = document.getElementById('languageSelect');
    const refreshButton = document.getElementById('refreshButton');

    playButton.style.display = 'none';
    streamingSection.style.display = 'block';
    streamingSection.scrollIntoView({ behavior: 'smooth' });

    // Set initial provider and language
    const defaultProvider = providerSelect.value;
    const selectedLanguage = languageSelect.value || 'en';
    let currentSrc = getProviderUrl(defaultProvider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode, selectedLanguage);
    streamingIframe.src = currentSrc;

    function handleIframeLoad() {
        // Optional: Check if content loaded (e.g., via postMessage or simple timeout check)
        console.log('Iframe loaded successfully');
    }

    function handleIframeError() {
        console.error('Iframe failed to load');
        alert('This provider is unavailable.');
    }

    streamingIframe.onload = () => {
        console.log('Iframe loaded successfully');
        // Automatically request fullscreen
        if (streamingIframe.requestFullscreen) {
            streamingIframe.requestFullscreen().catch(err => console.log('Error requesting fullscreen:', err));
        }
    };
    streamingIframe.onerror = handleIframeError;

    // Provider change handler
    providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        const lang = languageSelect.value || 'en';
        currentSrc = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode, lang);
        streamingIframe.src = currentSrc;
        // Re-attach handlers in case changed
        streamingIframe.onload = handleIframeLoad;
        streamingIframe.onerror = handleIframeError;
    });

    // Language change handler
    languageSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        const lang = languageSelect.value || 'en';
        currentSrc = getProviderUrl(provider, currentImdbId, currentContentId, currentType, currentSeason, currentEpisode, lang);
        streamingIframe.src = currentSrc;
        // Re-attach handlers in case changed
        streamingIframe.onload = handleIframeLoad;
        streamingIframe.onerror = handleIframeError;
    });

    // Refresh handler
    refreshButton.addEventListener('click', () => {
        streamingIframe.src = streamingIframe.src;
    });
}

// Toggle between All, Movies and TV
function toggleType(type) {
    currentType = type;
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn;
    if (type === 'all') {
        activeBtn = document.getElementById('allToggle');
    } else if (type === 'movie') {
        activeBtn = document.getElementById('movieToggle');
    } else if (type === 'tv') {
        activeBtn = document.getElementById('tvToggle');
    }
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
