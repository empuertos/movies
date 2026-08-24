// TMDB API key from Cloudflare Worker secret
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Main request handler with env parameter
async function handleRequest(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env);
    }

    // Serve static files (HTML, CSS, JS)
    try {
        // Map file paths to content types
        const fileMap = {
            '/': 'index.html',
            '/index.html': 'index.html',
            '/style.css': 'style.css',
            '/script.js': 'script.js',
            '/manifest.json': 'manifest.json',
            '/favicon.ico': 'favicon.ico'
        };

        const filePath = fileMap[url.pathname] || null;
        if (!filePath) {
            return new Response('Not Found', { status: 404, headers: corsHeaders });
        }

        // In Cloudflare Workers, you need to serve files from your script's assets
        // For simplicity, we'll serve index.html for all routes and let JS handle routing
        if (filePath === 'index.html' || filePath === '/') {
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MovieHub - Discover Your Next Favorite Film</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" href="favicon.ico">
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <header>
        <div class="container">
            <h1>MovieHub</h1>
            <div class="toggle-buttons">
                <button id="allToggle" class="toggle-btn active" data-type="all">All</button>
                <button id="movieToggle" class="toggle-btn" data-type="movie">Movies</button>
                <button id="tvToggle" class="toggle-btn" data-type="tv">TV Shows</button>
            </div>
            <button id="themeToggle" class="theme-btn">🌙</button>
            <div class="search-bar">
                <input type="text" placeholder="Search movies or TV shows...">
                <button>Search</button>
            </div>
        </div>
    </header>

    <main>
        <section id="hero">
            <div class="container">
                <h2>Welcome to MovieHub</h2>
                <p>Discover the latest movies, classics, and everything in between.</p>
            </div>
        </section>

        <section id="content">
            <div class="container">
                <h2>Featured Content</h2>
                <div class="movie-grid" id="movieGrid">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        </section>

        <!-- Content Details Modal -->
        <div id="movieModal" class="modal">
            <div class="modal-backdrop" onclick="closeModal()"></div>
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <div class="movie-details">
                    <img id="modalPoster" src="" alt="Content Poster" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
                    <div class="details-text">
                        <h2 id="modalTitle"></h2>
                        <p id="modalOverview"></p>
                        <p id="modalInfo"></p>
                    </div>
                </div>
                <div id="trailerSection">
                    <h3>Trailer</h3>
                    <iframe id="trailerIframe" width="100%" height="400" frameborder="0" allowfullscreen style="display: none;"></iframe>
                </div>
                <button id="playButton" onclick="playContent()">Play Full Movie</button>
                <div id="streamingSection" style="display: none;">
                    <h3>Watch Content</h3>
                    <div class="provider-controls">
                        <select id="seasonSelect" style="display: none;"></select>
                        <select id="episodeSelect" style="display: none;"></select>
                        <select id="providerSelect"></select>
                        <button id="refreshButton">Refresh</button>
                    </div>
                    <iframe id="streamingIframe" width="100%" height="500" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
        </div>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2025 MovieHub. All rights reserved.</p>
        </div>
    </footer>

    <script src="/script.js"></script>
</body>
</html>`;
            return new Response(html, {
                headers: { ...corsHeaders, 'Content-Type': 'text/html' }
            });
        }

        // For other files, return a placeholder response
        // In production, you'd serve actual file content
        return new Response('File not found', { status: 404, headers: corsHeaders });

    } catch (error) {
        return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
    }
}

// API handler with env parameter
async function handleApiRequest(request, env) {
    const url = new URL(request.url);

    try {
        // Get API key from environment
        const TMDB_API_KEY = env.TMDB_API_KEY;
        
        if (!TMDB_API_KEY) {
            return new Response(JSON.stringify({ 
                error: 'TMDB API key not configured. Please set TMDB_API_KEY secret.' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let apiResponse;

        // Route handling
        if (url.pathname === '/api/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
            );
        } else if (url.pathname === '/api/tv/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
            );
        } else if (url.pathname === '/api/search') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
            );
        } else if (url.pathname === '/api/search/tv') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
            );
        } else if (url.pathname === '/api/details') {
            const movieId = url.searchParams.get('movie_id');
            if (!movieId) {
                return new Response(JSON.stringify({ error: 'Movie ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            const [detailsRes, videosRes] = await Promise.all([
                fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`),
                fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
            ]);
            if (!detailsRes.ok || !videosRes.ok) {
                throw new Error('API request failed');
            }
            const details = await detailsRes.json();
            const videos = await videosRes.json();
            return new Response(JSON.stringify({ details, videos }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else if (url.pathname === '/api/tv/details') {
            const tvId = url.searchParams.get('tv_id');
            if (!tvId) {
                return new Response(JSON.stringify({ error: 'TV ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            const [detailsRes, videosRes] = await Promise.all([
                fetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`),
                fetch(`${TMDB_BASE_URL}/tv/${tvId}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
            ]);
            if (!detailsRes.ok || !videosRes.ok) {
                throw new Error('API request failed');
            }
            const details = await detailsRes.json();
            const videos = await videosRes.json();
            return new Response(JSON.stringify({ details, videos }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else if (url.pathname === '/api/tv/external') {
            const tvId = url.searchParams.get('tv_id');
            if (!tvId) {
                return new Response(JSON.stringify({ error: 'TV ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`
            );
        } else if (url.pathname === '/api/seasons') {
            const tvId = url.searchParams.get('tv_id');
            if (!tvId) {
                return new Response(JSON.stringify({ error: 'TV ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`
            );
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                return new Response(JSON.stringify(data.seasons || []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else if (url.pathname === '/api/episodes') {
            const tvId = url.searchParams.get('tv_id');
            const season = url.searchParams.get('season');
            if (!tvId || !season) {
                return new Response(JSON.stringify({ error: 'TV ID and season required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`
            );
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                return new Response(JSON.stringify(data.episodes || []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else if (url.pathname === '/api/translate') {
            // Mock translation endpoint - returns original text
            const text = url.searchParams.get('text') || 'No text provided';
            return new Response(JSON.stringify({
                data: {
                    translations: [{
                        translatedText: text,
                        detectedSourceLanguage: 'en'
                    }]
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!apiResponse || !apiResponse.ok) {
            throw new Error(`API request failed: ${apiResponse?.status || 'Unknown error'}`);
        }

        const data = await apiResponse.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error', 
            details: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Export with env parameter for Cloudflare Workers
export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};