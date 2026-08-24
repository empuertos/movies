// ✅ Updated to your Worker URL
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

// Provider lists
const providersAlwaysAvailableMovie = ['vidora', 'vidrockembed', 'vidsrcpro', 'autoembedpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'xprime', 'vixsrc', 'rivestream', 'vidzee', '2embed', 'moviekex', 'vidpro', 'primesrc', 'moviesapi', 'frembed', 'uembed', 'warezcdn', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbMovie = ['vidsrccc', 'vidrock', 'autoembedpro', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];
const providersAlwaysAvailableTV = ['vidora', 'vidrockembed', 'vidsrcpro', 'autoembedpro', 'smashystream', 'embedsoap', 'vidplus', 'vidking', 'vixsrc', 'videasy', 'moviemaze', '123moviesfree'];
const providersRequiringImdbTV = ['vidsrccc', 'vidrock', 'autoembedpro', 'vidsrc', 'vidfast', 'autoembed', 'embedsu', '111movies', 'vidlink', 'videasy', 'vidsrcto', 'solarmovies', 'freehdmovies'];

// Create content card
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
    movieGrid.innerHTML = content.map(createContentCard).join('');
    allContent = content;
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Fetch popular content
async function fetchPopularContent() {
    try {
        let allResults = [];
        if (currentType === 'all') {
            const movieResponse = await fetchWithTimeout(`${API_BASE_URL}/api/popular?page=1`);
            const tvResponse = await fetchWithTimeout(`${API_BASE_URL}/api/tv/popular?page=1`);
            if (!movieResponse.ok || !tvResponse.ok) throw new Error('Proxy request failed');
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();
            allResults = movieData.results.concat(tvData.results);
        } else {
            const endpoint = currentType === 'movie' ? '/api/popular' : '/api/tv/popular';
            if (currentType === 'movie') {
                allResults = [];
                for (let page = 1; page <= 5; page++) {
                    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}?page=${page}`);
                    if (!response.ok) throw new Error('Proxy request failed');
                    const data = await response.json();
                    allResults = allResults.concat(data.results);
                }
            } else {
                const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}?page=1`);
                if (!response.ok) throw new Error('Proxy request failed');
                const data = await response.json();
                allResults = data.results;
            }
        }
        populateContent(allResults);
    } catch (error) {
        console.error('Error fetching content:', error);
        document.getElementById('movieGrid').innerHTML = '<p>Unable to load content. Please check your connection.</p>';
    }
}

// Search content
async function searchContent(query) {
    if (query.length < 3) {
        populateContent(allContent);
        return;
    }
    try {
        const [movieResponse, tvResponse] = await Promise.all([
            fetchWithTimeout(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`),
            fetchWithTimeout(`${API_BASE_URL}/api/search/tv?query=${encodeURIComponent(query)}`)
        ]);
        if (!movieResponse.ok || !tvResponse.ok) throw new Error('Proxy request failed');
        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();
        populateContent([...movieData.results, ...tvData.results]);
    } catch (error) {
        console.error('Error searching:', error);
        document.getElementById('movieGrid').innerHTML = '<p>Error searching content.</p>';
    }
}

// Show content details
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
        const endpoint = type === 'movie' ? 'details' : 'tv/details';
        const detailsResponse = await fetchWithTimeout(`${API_BASE_URL}/api/${endpoint}?${type === 'movie' ? 'movie_id' : 'tv_id'}=${contentId}`);
        if (!detailsResponse.ok) throw new Error(`Failed to fetch ${type} details`);
        const { details, videos } = await detailsResponse.json();

        if (type === 'movie') {
            currentImdbId = details.imdb_id || null;
        } else {
            const externalResponse = await fetchWithTimeout(`${API_BASE_URL}/api/tv/external?tv_id=${contentId}`);
            if (externalResponse.ok) {
                const externalData = await externalResponse.json();
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
        document.getElementById('modalOverview').textContent = details.overview || 'No overview available.';
        
        const posterElement = document.getElementById('modalPoster');
        const posterUrl = details.poster_path ? IMAGE_BASE_URL + details.poster_path : 'https://via.placeholder.com/200x300?text=No+Image';
        posterElement.src = posterUrl;

        const year = details.release_date ? details.release_date.split('-')[0] : (details.first_air_date ? details.first_air_date.split('-')[0] : 'N/A');
        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';
        const rating = details.vote_average ? (details.vote_average / 10).toFixed(1) : 'N/A';
        document.getElementById('modalInfo').textContent = `${year} | ${genres} | ${rating}`;

        // Handle trailer
        trailerIframe.style.display = 'none';
        let trailer = videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        if (!trailer) trailer = videos.results.find(v => v.site === 'YouTube');
        if (trailer) {
            trailerIframe.src = `https://www.youtube.com/embed/${trailer.key}`;
            trailerIframe.style.display = 'block';
        } else {
            trailerSection.innerHTML = '<h3>Trailer</h3><p>No trailer available.</p>';
        }

        // Handle seasons/episodes for TV shows
        if (type === 'tv') {
            const seasonsResponse = await fetchWithTimeout(`${API_BASE_URL}/api/seasons?tv_id=${contentId}`);
            if (seasonsResponse.ok) {
                const tvData = await seasonsResponse.json();
                seasons = tvData || [];
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
    } catch (error) {
        console.error(`Error loading ${type} details:`, error);
        alert(`Failed to load ${type} details.`);
    }
}

// Load episodes
async function loadEpisodes(seasonNumber) {
    if (!currentContentId) return;
    const episodeSelect = document.getElementById('episodeSelect');
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/episodes?tv_id=${currentContentId}&season=${seasonNumber}`);
        if (!response.ok) throw new Error('Failed to fetch episodes');
        const episodesData = await response.json();
        episodes = episodesData || [];
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
                default: return `https://vidrock.net/embed/tv/${contentId}/${season}/${episode}?ads=0`;
            }
        } else {
            switch(provider) {
                case 'vidora': return `https://vidora.su/movie/${contentId}?colour=1100ff&autoplay=true`;
                case 'vidrockembed': return `https://vidrock.net/embed/movie/${contentId}?ads=0`;
                case 'vidsrcpro': return `https://vidsrc.pro/embed/movie/${contentId}?ads=0`;
                default: return `https://vidrock.net/embed/movie/${contentId}?ads=0`;
            }
        }
    }
    if (isTV) {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidrock': return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0`;
            case 'vidsrc': return `https://vidsrc.me/embed/tv/${imdbId}/${season}/${episode}?ads=0`;
            default: return `https://vidrock.net/tv/${imdbId}/${season}/${episode}?ads=0`;
        }
    } else {
        switch(provider) {
            case 'vidsrccc': return `https://vidsrc.cc/v2/embed/movie/${imdbId}?ads=0`;
            case 'vidrock': return `https://vidrock.net/movie/${imdbId}?ads=0`;
            case 'vidsrc': return `https://vidsrc.me/embed/movie/${imdbId}?ads=0`;
            default: return `https://vidrock.net/movie/${imdbId