# ARVIO Discover (Standalone Stremio / ARVIO Addon)

A standalone catalog and metadata addon designed for ARVIO and Stremio-compatible media apps.

## Catalog Ecosystem

1. **Public & Streaming Catalogs**:
   - General Trends: Weekly Trending, Coming Soon, Top Rated, and Popular.
   - Streaming Networks: Popular on Netflix, HBO Max, Disney+, Apple TV+, and Prime Video.
   - Curated Franchises: Trending Anime, Studio Ghibli Masterpieces, and A24 Films.
2. **Private Tracker Delegation (`clientDelegate`)**:
   - Trakt: Personal Watchlists and Watched History (`trakt:watchlist`, `trakt:watched`).
   - SIMKL: Plan to Watch and Completed Lists (`simkl:plantowatch`, `simkl:completed`).
3. **Local Home Server & IPTV VOD Delegation (`clientDelegate`)**:
   - Home Server: Direct access to connected Jellyfin, Emby, and Plex libraries (`homeserver:library`).
   - IPTV / VOD: Recently added VOD movies and series from connected Xtream/Stalker playlists (`vod:recent`, `vod:categories`).
4. **Hybrid & Cross-Filtered Catalogs (`clientFilter`)**:
   - Cross-references curated TMDB trends and personal watchlists against local IPTV VOD or Home Server storage (`clientFilter: "vod:available"`, `clientFilter: "homeserver:available"`).
5. **Configurator Presets**:
   - 1-click presets: *Public Trends*, *The Streamer*, *IPTV & VOD*, *Self-Hoster & Trackers*, and *Anime & Animation*.

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
