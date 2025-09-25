import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

router.get('/', async (request, env) => {
  // Access the secret API key from env
  const apiKey = env.OMDB_API;

  // Get the movie query parameter
  const url = new URL(request.url);
  const movieQuery = url.searchParams.get('movie');

  if (!movieQuery) {
    return new Response(JSON.stringify({ error: 'Missing movie parameter' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    // Build OMDB API URL
    const omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&${movieQuery.startsWith('tt') ? 'i=' : 't='}${encodeURIComponent(movieQuery)}`;

    // Fetch from OMDB API
    const response = await fetch(omdbUrl);
    const data = await response.json();

    // Return the OMDB response
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching from OMDB:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch movie data' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});

router.get('/search', async (request, env) => {
  // Access the secret API key from env
  const apiKey = env.OMDB_API;

  // Get the search query parameter
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing q parameter' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    // Build OMDB API URL for search
    const omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`;

    // Fetch from OMDB API
    const response = await fetch(omdbUrl);
    const data = await response.json();

    // Return the OMDB response
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching from OMDB:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch search results' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});

export default router
