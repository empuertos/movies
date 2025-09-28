const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'your-local-key-here'; // Set via .env or environment variable for security
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Middleware
app.use(cors());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// Proxy for popular movies
app.get('/api/popular', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        res.status(500).json({ error: 'Failed to fetch popular movies' });
    }
});

// Proxy for popular TV shows
app.get('/api/tv/popular', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const response = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching popular TV shows:', error);
        res.status(500).json({ error: 'Failed to fetch popular TV shows' });
    }
});

// Proxy for search movies
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Query must be at least 3 characters' });
        }
        const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error searching movies:', error);
        res.status(500).json({ error: 'Failed to search movies' });
    }
});

// Proxy for search TV shows
app.get('/api/search/tv', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Query must be at least 3 characters' });
        }
        const response = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error searching TV shows:', error);
        res.status(500).json({ error: 'Failed to search TV shows' });
    }
});

// Proxy for movie details and videos
app.get('/api/details', async (req, res) => {
    try {
        const movieId = req.query.movie_id;
        if (!movieId) {
            return res.status(400).json({ error: 'Movie ID required' });
        }
        const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const videosUrl = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const [detailsRes, videosRes] = await Promise.all([fetch(detailsUrl), fetch(videosUrl)]);
        if (!detailsRes.ok || !videosRes.ok) {
            throw new Error('API request failed');
        }
        const details = await detailsRes.json();
        const videos = await videosRes.json();
        res.json({ details, videos });
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

// Proxy for TV details and videos
app.get('/api/tv/details', async (req, res) => {
    try {
        const tvId = req.query.tv_id;
        if (!tvId) {
            return res.status(400).json({ error: 'TV ID required' });
        }
        const detailsUrl = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const videosUrl = `${TMDB_BASE_URL}/tv/${tvId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
        const [detailsRes, videosRes] = await Promise.all([fetch(detailsUrl), fetch(videosUrl)]);
        if (!detailsRes.ok || !videosRes.ok) {
            throw new Error('API request failed');
        }
        const details = await detailsRes.json();
        const videos = await videosRes.json();
        res.json({ details, videos });
    } catch (error) {
        console.error('Error fetching TV details:', error);
        res.status(500).json({ error: 'Failed to fetch TV details' });
    }
});

// Proxy for TV external IDs (IMDB ID)
app.get('/api/tv/external', async (req, res) => {
    try {
        const tvId = req.query.tv_id;
        if (!tvId) {
            return res.status(400).json({ error: 'TV ID required' });
        }
        const externalUrl = `${TMDB_BASE_URL}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`;
        const response = await fetch(externalUrl);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching TV external IDs:', error);
        res.status(500).json({ error: 'Failed to fetch TV external IDs' });
    }
});

// Proxy for TV seasons
app.get('/api/seasons', async (req, res) => {
    try {
        const tvId = req.query.tv_id;
        if (!tvId) {
            return res.status(400).json({ error: 'TV ID required' });
        }
        const seasonsUrl = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const response = await fetch(seasonsUrl);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data.seasons || []);
    } catch (error) {
        console.error('Error fetching TV seasons:', error);
        res.status(500).json({ error: 'Failed to fetch TV seasons' });
    }
});

// Proxy for TV episodes
app.get('/api/episodes', async (req, res) => {
    try {
        const tvId = req.query.tv_id;
        const season = req.query.season;
        if (!tvId || !season) {
            return res.status(400).json({ error: 'TV ID and season required' });
        }
        const episodesUrl = `${TMDB_BASE_URL}/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`;
        const response = await fetch(episodesUrl);
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        res.json(data.episodes || []);
    } catch (error) {
        console.error('Error fetching TV episodes:', error);
        res.status(500).json({ error: 'Failed to fetch TV episodes' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
