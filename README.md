# ARVIO Discover (Standalone Stremio / ARVIO Addon)

A standalone catalog and metadata addon designed for ARVIO and Stremio-compatible media apps.

## Architecture

1. **Public Catalogs**: Served directly by this addon server using the TMDB API (Trending Movies, Trending Shows, Coming Soon, Top Rated, and Popular).
2. **Private Delegated Rows**: Uses ARVIO's client-side delegation protocol (`clientDelegate` URIs). Rows like Trakt Watchlists, Trakt Watched History, SIMKL Plan to Watch, and Home Server libraries are declared in the manifest with a capability URI (e.g. `clientDelegate: "trakt:watchlist?type=movie"`).
   - **Zero Token Sharing**: ARVIO resolves delegated rows directly on-device using the user's active profile connections.
   - **Privacy First**: User credentials, watch history, and private home server IPs are never transmitted to this addon server.

## Run Locally

Requires Node.js 22 or later.

1. (Optional) Provide a TMDB API Read Access Token for live metadata and preview posters:
   Create `.env.local` inside this directory:
   ```env
   TMDB_READ_TOKEN=your_tmdb_read_access_token
   PORT=8787
   ```

2. Start the development server:
   ```sh
   cd discover-addon
   npm run dev
   ```

3. Open the Configurator:
   - Local: `http://localhost:8787/configure`
   - Network: `http://<your-lan-ip>:8787/configure`

4. Select the rows you want on your Home screen and click **Copy URL** or **Install in Stremio / ARVIO**.

## Deployment

Deploy this folder to any Node.js hosting platform (Cloudflare Workers via Node runtime, Fly.io, Railway, Render, Netlify Functions, or Docker).

Set `TMDB_READ_TOKEN` in your deployment environment variables.

## Verify & Test

Run the test suite:
```sh
npm test
```
The test suite validates manifest generation, public catalog resolution, and client-side delegation handling with zero external dependencies.
