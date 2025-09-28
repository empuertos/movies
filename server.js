const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;
const TMDB_API_KEY = 'cb01dd617d05f4329238ff90e0337f17';
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
