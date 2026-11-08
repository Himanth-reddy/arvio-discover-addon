import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { configurePage } from './configure.mjs';

export const catalogs = [
  // Public Catalogs (Resolved by this addon server via TMDB)
  {
    id: 'trending-movies',
    type: 'movie',
    name: 'Trending Movies',
    category: 'public',
    description: 'Weekly trending films across worldwide box office and streaming.',
    path: '/trending/movie/week',
  },
  {
    id: 'trending-shows',
    type: 'series',
    name: 'Trending Shows',
    category: 'public',
    description: 'Top trending series and television shows this week.',
    path: '/trending/tv/week',
  },
  {
    id: 'coming-soon',
    type: 'movie',
    name: 'Coming Soon',
    category: 'public',
    description: 'Upcoming theatrical premieres and digital releases.',
    path: '/movie/upcoming',
  },
  {
    id: 'popular-movies',
    type: 'movie',
    name: 'Popular Movies',
    category: 'public',
    description: 'Most popular films of all time and current hits.',
    path: '/movie/popular',
  },
  {
    id: 'popular-shows',
    type: 'series',
    name: 'Popular Series',
    category: 'public',
    description: 'High-rated and broadly watched television series.',
    path: '/tv/popular',
  },
  {
    id: 'top-rated-movies',
    type: 'movie',
    name: 'Top Rated Movies',
    category: 'public',
    description: 'Highest audience and critic rated movies.',
    path: '/movie/top_rated',
  },
  {
    id: 'top-rated-shows',
    type: 'series',
    name: 'Top Rated Shows',
    category: 'public',
    description: 'Highest audience and critic rated series.',
    path: '/tv/top_rated',
  },

  // Delegated Trakt Catalogs (Resolved on-device by ARVIO using active profile's Trakt session)
  {
    id: 'trakt-watchlist-movies',
    type: 'movie',
    name: 'My Trakt Watchlist · Movies',
    category: 'trakt',
    description: 'Personal Trakt movie watchlist, resolved on-device with zero token sharing.',
    clientDelegate: 'trakt:watchlist?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'trakt-watchlist-shows',
    type: 'series',
    name: 'My Trakt Watchlist · Shows',
    category: 'trakt',
    description: 'Personal Trakt series watchlist, resolved on-device with zero token sharing.',
    clientDelegate: 'trakt:watchlist?type=tv',
    requiresDelegate: true,
  },
  {
    id: 'trakt-watched-movies',
    type: 'movie',
    name: 'Trakt Watched History · Movies',
    category: 'trakt',
    description: 'Movies marked watched on your connected Trakt profile.',
    clientDelegate: 'trakt:watched?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'trakt-watched-shows',
    type: 'series',
    name: 'Trakt Watched History · Shows',
    category: 'trakt',
    description: 'Shows and series you have watched on your connected Trakt profile.',
    clientDelegate: 'trakt:watched?type=tv',
    requiresDelegate: true,
  },

  // Delegated SIMKL Catalogs (Resolved on-device by ARVIO using active profile's SIMKL session)
  {
    id: 'simkl-plan-movies',
    type: 'movie',
    name: 'SIMKL Plan to Watch · Movies',
    category: 'simkl',
    description: 'Movies on your SIMKL Plan to Watch list.',
    clientDelegate: 'simkl:plantowatch?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'simkl-plan-shows',
    type: 'series',
    name: 'SIMKL Plan to Watch · Shows',
    category: 'simkl',
    description: 'Shows and anime on your SIMKL Plan to Watch list.',
    clientDelegate: 'simkl:plantowatch?type=tv',
    requiresDelegate: true,
  },
  {
    id: 'simkl-completed-movies',
    type: 'movie',
    name: 'SIMKL Completed · Movies',
    category: 'simkl',
    description: 'Movies in your SIMKL Completed/Watched library.',
    clientDelegate: 'simkl:completed?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'simkl-completed-shows',
    type: 'series',
    name: 'SIMKL Completed · Shows',
    category: 'simkl',
    description: 'Series and anime in your SIMKL Completed library.',
    clientDelegate: 'simkl:completed?type=tv',
    requiresDelegate: true,
  },

  // Delegated Home Server Catalogs (Resolved on-device from local Jellyfin/Plex/Emby connections)
  {
    id: 'homeserver-movies',
    type: 'movie',
    name: 'Home Server · Movies',
    category: 'homeserver',
    description: 'Movie libraries from your connected Jellyfin, Plex, or Emby home servers.',
    clientDelegate: 'homeserver:library?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'homeserver-shows',
    type: 'series',
    name: 'Home Server · TV Shows',
    category: 'homeserver',
    description: 'TV show libraries from your connected Jellyfin, Plex, or Emby home servers.',
    clientDelegate: 'homeserver:library?type=tv',
    requiresDelegate: true,
  },
];

const types = ['movie', 'series'];
const prefix = 'arvio-discover:';
const catalogCacheMs = 5 * 60_000;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(response, status, data, maxAge = 0) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
  });
  response.end(JSON.stringify(data));
}

function image(path, size) {
  return typeof path === 'string' && /^\/[\w.-]+$/.test(path)
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : undefined;
}

function metadata(item, type) {
  const name = type === 'movie' ? item.title : item.name;
  const date = type === 'movie' ? item.release_date : item.first_air_date;
  if (!Number.isSafeInteger(item.id) || item.id < 1 || !name) return null;
  return {
    id: `${prefix}${item.id}`,
    tmdb_id: String(item.id),
    imdb_id: item.external_ids?.imdb_id || undefined,
    type,
    name,
    description: item.overview || undefined,
    poster: image(item.poster_path, 'w342'),
    background: image(item.backdrop_path, 'w1280'),
    releaseInfo: date?.slice(0, 4) || undefined,
    genres: item.genres?.map((genre) => genre.name),
  };
}

export function manifest(selected) {
  return {
    id: 'tv.arvio.discover',
    version: '1.0.0',
    name: 'ARVIO Discover',
    description: 'Curate your Home screen with public catalogs, personal Trakt/SIMKL watchlists, and home server libraries.',
    types,
    resources: ['catalog', { name: 'meta', types, idPrefixes: [prefix] }],
    behaviorHints: { configurable: true },
    catalogs: selected.map(({ id, type, name, clientDelegate }) => ({
      id,
      type,
      name,
      ...(clientDelegate ? { clientDelegate } : {}),
    })),
  };
}

export function createAddonServer({ token = process.env.TMDB_READ_TOKEN, fetcher = fetch, networkAddress } = {}) {
  const cache = new Map();

  async function tmdb(path) {
    if (!token) throw new RequestError(503, 'Set TMDB_READ_TOKEN to enable catalogs and metadata.');
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.set('language', 'en-US');
    try {
      const result = await fetcher(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (result.status === 404) throw new RequestError(404, 'Title not found.');
      if (!result.ok) throw new Error('TMDB request failed.');
      return await result.json();
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(502, 'TMDB is temporarily unavailable.');
    }
  }

  async function loadCatalog(catalog) {
    const previous = cache.get(catalog.id);
    if (previous?.expires > Date.now()) return previous.result;
    const result = tmdb(catalog.path).then((payload) => {
      if (!Array.isArray(payload.results)) throw new RequestError(502, 'TMDB returned an invalid catalog.');
      return payload.results
        .filter((item) => item && !item.adult)
        .map((item) => metadata(item, catalog.type))
        .filter(Boolean);
    });
    cache.set(catalog.id, { result, expires: Date.now() + catalogCacheMs });
    try {
      return await result;
    } catch (error) {
      if (cache.get(catalog.id)?.result === result) cache.delete(catalog.id);
      throw error;
    }
  }

  return createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        });
        return response.end();
      }

      if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET, OPTIONS');
        throw new RequestError(405, 'Use GET.');
      }

      const url = new URL(request.url, 'http://localhost');
      const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
      const selectedIds = parts[0] === 'c' ? parts.splice(0, 2)[1]?.split(',') : null;
      const selected = selectedIds
        ? catalogs.filter(({ id }) => selectedIds.includes(id))
        : catalogs.filter((row) => !row.requiresDelegate);

      if (!selected.length || (selectedIds && selected.length !== selectedIds.length)) {
        throw new RequestError(404, 'Unknown catalog selection.');
      }

      // Configure UI
      if (parts.length === 1 && ['', 'configure'].includes(parts[0])) {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        const networkOrigin = networkAddress ? `http://${networkAddress}:${request.socket.localPort}` : '';
        return response.end(configurePage(catalogs, selected, Boolean(token), networkOrigin));
      }

      // Manifest
      if (parts.length === 1 && parts[0] === 'manifest.json') {
        return json(response, 200, manifest(selected), 300);
      }

      // Catalog & Meta resources
      const [resource, type, filename] = parts;
      if (parts.length === 3 && types.includes(type) && filename.endsWith('.json')) {
        const id = filename.slice(0, -5);
        if (resource === 'catalog') {
          const catalog = selected.find((row) => row.id === id && row.type === type);
          if (catalog?.requiresDelegate) {
            throw new RequestError(
              403,
              `This row uses client-side delegation (${catalog.clientDelegate || 'private'}). ARVIO resolves it locally on-device.`
            );
          }
          if (catalog) return json(response, 200, { metas: await loadCatalog(catalog) }, 300);
        }

        if (resource === 'meta' && id.startsWith(prefix) && /^[1-9]\d{0,9}$/.test(id.slice(prefix.length))) {
          const providerType = type === 'movie' ? 'movie' : 'tv';
          const title = await tmdb(`/${providerType}/${id.slice(prefix.length)}?append_to_response=external_ids`);
          const meta = title && metadata(title, type);
          if (!meta) throw new RequestError(502, 'TMDB returned invalid metadata.');
          return json(response, 200, { meta }, 3600);
        }
      }

      throw new RequestError(404, 'Resource not found.');
    } catch (error) {
      if (error instanceof URIError) return json(response, 400, { error: 'Invalid URL encoding.' });
      const status = error instanceof RequestError ? error.status : 500;
      return json(response, status, { error: status === 500 ? 'Unexpected server error.' : error.message });
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    loadEnvFile(new URL('.env.local', import.meta.url));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const port = Number(process.env.PORT || 8787);
  const networkAddresses = process.argv.includes('--dev')
    ? Object.values(networkInterfaces()).flat()
      .filter(({ family, internal }) => family === 'IPv4' && !internal)
      .map(({ address }) => address)
    : [];
  const server = createAddonServer({ networkAddress: networkAddresses[0] }).listen(port, '0.0.0.0', () => {
    const listeningPort = server.address().port;
    console.log(`Local:   http://localhost:${listeningPort}/configure`);
    for (const address of networkAddresses) {
      console.log(`Network: http://${address}:${listeningPort}/configure`);
    }
  });
}
