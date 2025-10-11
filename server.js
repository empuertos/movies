import fetch from 'node-fetch';

// TMDB API key is stored in Cloudflare Worker secret variable
// In Cloudflare Workers, secret variables are automatically available by name
const TMDB_API_KEY = 'TMDB_API_KEY'; // This will be replaced with the actual secret value at runtime
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Simple CORS headers helper
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper function to handle requests
async function handleRequest(request) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Serve static files
    if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        try {
            const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
            const file = await fetch(new Request(`file://${new URL('.', import.meta.url).pathname}${filePath}`));
            if (file.ok) {
                const headers = { ...corsHeaders };
                if (filePath.endsWith('.js')) {
                    headers['Content-Type'] = 'application/javascript';
                } else if (filePath.endsWith('.css')) {
                    headers['Content-Type'] = 'text/css';
                } else if (filePath.endsWith('.html')) {
                    headers['Content-Type'] = 'text/html';
                }
                return new Response(file.body, { headers });
            }
        } catch (error) {
            // File not found, continue to API routes
        }
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request);
    }

    // Default response
    return new Response('Not Found', { status: 404, headers: corsHeaders });
}

// Helper function for API requests
async function handleApiRequest(request) {
    const url = new URL(request.url);

    try {
        let apiResponse;

        // Route handling
        if (url.pathname === '/api/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiResponse = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
        } else if (url.pathname === '/api/tv/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiResponse = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
        } else if (url.pathname === '/api/search') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        } else if (url.pathname === '/api/search/tv') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        } else if (url.pathname === '/api/details') {
            const movieId = url.searchParams.get('movie_id');
            if (!movieId) {
                return new Response(JSON.stringify({ error: 'Movie ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
            const videosUrl = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
            const [detailsRes, videosRes] = await Promise.all([fetch(detailsUrl), fetch(videosUrl)]);
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
            const detailsUrl = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
            const videosUrl = `${TMDB_BASE_URL}/tv/${tvId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
            const [detailsRes, videosRes] = await Promise.all([fetch(detailsUrl), fetch(videosUrl)]);
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
            apiResponse = await fetch(`${TMDB_BASE_URL}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`);
        } else if (url.pathname === '/api/seasons') {
            const tvId = url.searchParams.get('tv_id');
            if (!tvId) {
                return new Response(JSON.stringify({ error: 'TV ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiResponse = await fetch(`${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
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
            apiResponse = await fetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                return new Response(JSON.stringify(data.episodes || []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else if (url.pathname === '/api/translate') {
            const text = url.searchParams.get('text');
            if (!text) {
                return new Response(JSON.stringify({ error: 'Text to translate is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
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

        if (!apiResponse) {
            return new Response(JSON.stringify({ error: 'No response from API' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!apiResponse.ok) {
            throw new Error('API request failed');
        }

        const data = await apiResponse.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Export for Cloudflare Workers ES Module format
export default {
    fetch: handleRequest
};
