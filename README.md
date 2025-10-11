# MovieHub - Movie Database Application

A modern movie and TV show discovery application built with Express.js and Cloudflare Workers.

## Features

- 🎬 Browse popular movies and TV shows
- 🔍 Search for movies and TV shows
- 📱 Responsive design with dark/light theme
- 🎭 Multiple streaming providers
- 🌐 PWA support

## Setup

### 1. Get TMDB API Key

1. Visit [TMDB API Settings](https://www.themoviedb.org/settings/api)
2. Create an account and get your API key

### 2. Deploy to Cloudflare Workers

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Set up the project:
   ```bash
   wrangler init movies-main --yes
   ```

4. Add TMDB API Key as secret:
   ```bash
   wrangler secret put TMDB_API_KEY
   ```
   Enter your TMDB API key when prompted.

5. Deploy:
   ```bash
   wrangler deploy
   ```

The worker will be available at: https://movies-main.your-subdomain.workers.dev

## Development

### Local Development

To run locally:

```bash
npm install
# Set TMDB_API_KEY in .env file (for local development)
npm start
```

### Cloudflare Worker Deployment

The `wrangler.toml` file configures the Cloudflare Worker deployment:

- **Worker Name**: `movies-main`
- **Main Entry**: `server.js`
- **Node.js Compatibility**: Enabled via `nodejs_compat` flag for Express.js support
- **Compatibility Date**: 2024-10-01 (Node.js compatibility)
- **Module Format**: ES Module with `export default` for Cloudflare Workers compatibility

To deploy:

```bash
# IMPORTANT: Navigate to your project directory first
cd movies-main

# Set your TMDB API key as a secret
wrangler secret put TMDB_API_KEY

# Deploy to Cloudflare Workers (using wrangler.toml)
wrangler deploy

# OR deploy with explicit name (if wrangler.toml isn't detected)
wrangler deploy --name movies-main

# Check deployments
wrangler deployments list

# View logs
wrangler tail

# View specific version details
wrangler versions view <version-id>
```

## Troubleshooting

### Wrangler Issues

**"Required Worker name missing" error:**
- **Navigate to project directory first**: `cd movies-main` (you're currently in the wrong directory)
- Ensure you're in the correct directory containing `wrangler.toml`
- Try using explicit name: `wrangler deploy --name movies-main`
- Clear Wrangler cache: `wrangler cache clean`

**Node.js module errors:**
- Verify `nodejs_compat` flag is enabled in `wrangler.toml`
- Ensure `compatibility_date` is set to `2024-10-01` or later
- Check that `server.js` uses ES Module format (`import`/`export`)

**Build errors:**
- Run `npm install` to ensure all dependencies are available
- Check that all required files are present in the project directory

## Architecture

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Backend**: Express.js server with TMDB API integration
- **Deployment**: Cloudflare Workers for serverless hosting
- **Styling**: Custom CSS with dark/light theme support

## API Endpoints

- `GET /api/popular` - Get popular movies
- `GET /api/tv/popular` - Get popular TV shows
- `GET /api/search` - Search movies
- `GET /api/search/tv` - Search TV shows
- `GET /api/details` - Get movie details and videos
- `GET /api/tv/details` - Get TV show details and videos
- `GET /api/tv/external` - Get TV show external IDs
- `GET /api/seasons` - Get TV show seasons
- `GET /api/episodes` - Get TV show episodes
- `GET /api/translate` - Translation service (returns original text)
