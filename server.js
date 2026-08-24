// Complete server.js with proper CORS and error handling
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

async function handleRequest(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { 
            headers: corsHeaders,
            status: 204
        });
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env);
    }

    // For non-API routes, return a simple response
    return new Response('MovieHub API is running. Use /api/ endpoints.', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
}

async function handleApiRequest(request, env) {
    const url = new URL(request.url);

    try {
        const TMDB_API_KEY = env.TMDB_API_KEY;
        
        if (!TMDB_API_KEY) {
            return new Response(JSON.stringify({ 
                error: 'TMDB API key not configured'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let apiUrl = '';
        let apiResponse;

        // Build the TMDB API URL
        if (url.pathname === '/api/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiUrl = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
        } else if (url.pathname === '/api/tv/popular') {
            const page = parseInt(url.searchParams.get('page')) || 1;
            apiUrl = `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
        } else if (url.pathname === '/api/search') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters', results: [] }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
        } else if (url.pathname === '/api/search/tv') {
            const query = url.searchParams.get('query');
            if (!query || query.length < 3) {
                return new Response(JSON.stringify({ error: 'Query must be at least 3 characters', results: [] }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
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
                throw new Error('TMDB API request failed');
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
                throw new Error('TMDB API request failed');
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
            apiUrl = `${TMDB_BASE_URL}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`;
        } else if (url.pathname === '/api/seasons') {
            const tvId = url.searchParams.get('tv_id');
            if (!tvId) {
                return new Response(JSON.stringify({ error: 'TV ID required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            apiUrl = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
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
            apiUrl = `${TMDB_BASE_URL}/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`;
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                return new Response(JSON.stringify(data.episodes || []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else {
            return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!apiUrl) {
            return new Response(JSON.stringify({ error: 'Invalid API request' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        apiResponse = await fetch(apiUrl);
        
        if (!apiResponse.ok) {
            throw new Error(`TMDB API returned ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        
        // Ensure we always return an object with results
        if (!data.results) {
            data.results = [];
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            results: [],
            message: error.message
        }), {
            status: 200, // Return 200 with empty results to avoid breaking frontend
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};