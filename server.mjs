import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { configurePage } from './configure.mjs';

export class ConfigStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.configs = new Map();
    this.load();
  }

  load() {
    if (!this.filePath) return;
    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf-8'));
      for (const [id, value] of Object.entries(data)) {
        this.configs.set(id, Array.isArray(value) ? value : value?.selectedIds || []);
      }
    } catch {
      // file might not exist yet, that's fine
    }
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      const obj = Object.fromEntries(this.configs);
      writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save configs:', e.message);
    }
  }

  get(profileId) {
    return this.configs.get(profileId);
  }

  set(profileId, selectedIds) {
    this.configs.set(profileId, selectedIds);
    this.save();
  }
}

export const catalogs = [
  // Public Catalogs (Resolved by this addon server via TMDB)
  {
    id: 'trending-movies',
    type: 'movie',
    name: 'Trending Movies',
    category: 'public',
    description: 'Weekly trending films across worldwide box office and streaming.',
    path: '/trending/movie/week',
    isDefault: true,
  },
  {
    id: 'trending-shows',
    type: 'series',
    name: 'Trending Shows',
    category: 'public',
    description: 'Top trending series and television shows this week.',
    path: '/trending/tv/week',
    isDefault: true,
  },
  {
    id: 'coming-soon',
    type: 'movie',
    name: 'Coming Soon',
    category: 'public',
    description: 'Upcoming theatrical premieres and digital releases.',
    path: '/movie/upcoming',
    isDefault: true,
  },
  {
    id: 'popular-movies',
    type: 'movie',
    name: 'Popular Movies',
    category: 'public',
    description: 'Most popular films of all time and current hits.',
    path: '/movie/popular',
    isDefault: true,
  },
  {
    id: 'popular-shows',
    type: 'series',
    name: 'Popular Series',
    category: 'public',
    description: 'High-rated and broadly watched television series.',
    path: '/tv/popular',
    isDefault: true,
  },
  {
    id: 'top-rated-movies',
    type: 'movie',
    name: 'Top Rated Movies',
    category: 'public',
    description: 'Highest audience and critic rated movies.',
    path: '/movie/top_rated',
    isDefault: true,
  },
  {
    id: 'top-rated-shows',
    type: 'series',
    name: 'Top Rated Shows',
    category: 'public',
    description: 'Highest audience and critic rated series.',
    path: '/tv/top_rated',
    isDefault: true,
  },

  // Streaming Networks (Public TMDB Discover)
  {
    id: 'netflix-movies',
    type: 'movie',
    name: 'Popular on Netflix · Movies',
    category: 'streaming',
    description: 'Top trending and popular films streaming on Netflix.',
    path: '/discover/movie?with_watch_providers=8&watch_region=US&sort_by=popularity.desc',
  },
  {
    id: 'netflix-shows',
    type: 'series',
    name: 'Popular on Netflix · Shows',
    category: 'streaming',
    description: 'Binge-worthy and trending television series on Netflix.',
    path: '/discover/tv?with_watch_providers=8&watch_region=US&sort_by=popularity.desc',
  },
  {
    id: 'apple-tv-shows',
    type: 'series',
    name: 'Top on Apple TV+ · Shows',
    category: 'streaming',
    description: 'Critically acclaimed original series on Apple TV+.',
    path: '/discover/tv?with_watch_providers=350&watch_region=US&sort_by=popularity.desc',
  },
  {
    id: 'disney-plus-movies',
    type: 'movie',
    name: 'Popular on Disney+ · Movies',
    category: 'streaming',
    description: 'Disney, Pixar, Marvel, and Star Wars movies streaming on Disney+.',
    path: '/discover/movie?with_watch_providers=337&watch_region=US&sort_by=popularity.desc',
  },
  {
    id: 'hbo-max-shows',
    type: 'series',
    name: 'Top on HBO Max · Shows',
    category: 'streaming',
    description: 'Hit drama, prestige television, and comedy series streaming on Max.',
    path: '/discover/tv?with_watch_providers=1899&watch_region=US&sort_by=popularity.desc',
  },
  {
    id: 'prime-movies',
    type: 'movie',
    name: 'Popular on Prime Video · Movies',
    category: 'streaming',
    description: 'Featured theatrical hits and Amazon Originals on Prime Video.',
    path: '/discover/movie?with_watch_providers=9&watch_region=US&sort_by=popularity.desc',
  },

  // Curated Franchises & Themes (Public TMDB)
  {
    id: 'anime-trending-shows',
    type: 'series',
    name: 'Trending Anime · Series',
    category: 'curated',
    description: 'Popular Japanese animation series, simulcasts, and season hits.',
    path: '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc',
  },
  {
    id: 'ghibli-movies',
    type: 'movie',
    name: 'Studio Ghibli Masterpieces',
    category: 'curated',
    description: 'Timeless animated classics from Hayao Miyazaki and Studio Ghibli.',
    path: '/discover/movie?with_companies=10342&sort_by=popularity.desc',
  },
  {
    id: 'a24-movies',
    type: 'movie',
    name: 'A24 Films Spotlight',
    category: 'curated',
    description: 'Award-winning indie hits, dramas, and thrillers produced by A24.',
    path: '/discover/movie?with_companies=41077&sort_by=popularity.desc',
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

  // Delegated VOD Catalogs (Resolved on-device by ARVIO using connected IPTV / Xtream / Stalker playlists)
  {
    id: 'vod-recent-movies',
    type: 'movie',
    name: 'IPTV VOD · Recently Added Movies',
    category: 'vod',
    description: 'Latest movies added to your connected IPTV / Xtream Codes playlist.',
    clientDelegate: 'vod:recent?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'vod-recent-shows',
    type: 'series',
    name: 'IPTV VOD · Recently Added Shows',
    category: 'vod',
    description: 'Latest series and episodes added to your connected IPTV / Xtream Codes playlist.',
    clientDelegate: 'vod:recent?type=series',
    requiresDelegate: true,
  },
  {
    id: 'vod-categories-movies',
    type: 'movie',
    name: 'IPTV VOD · Movie Categories',
    category: 'vod',
    description: 'Top VOD movie categories from your active IPTV / Stalker portal.',
    clientDelegate: 'vod:categories?type=movie',
    requiresDelegate: true,
  },
  {
    id: 'vod-categories-shows',
    type: 'series',
    name: 'IPTV VOD · Series Categories',
    category: 'vod',
    description: 'Top VOD series categories from your active IPTV / Stalker portal.',
    clientDelegate: 'vod:categories?type=series',
    requiresDelegate: true,
  },

  // Hybrid & Cross-Filtered Rows (Cross-referencing curated catalogs with local availability)
  {
    id: 'hybrid-trending-vod-movies',
    type: 'movie',
    name: 'Trending Movies · Available on IPTV',
    category: 'hybrid',
    description: 'Weekly trending films filtered on-device to titles available in your IPTV VOD.',
    path: '/trending/movie/week',
    clientFilter: '{"availableOn":"vod"}',
  },
  {
    id: 'hybrid-watchlist-vod-movies',
    type: 'movie',
    name: 'Trakt Watchlist · Available on IPTV',
    category: 'hybrid',
    description: 'Trakt Watchlist titles matched on-device with your connected IPTV VOD library.',
    clientDelegate: 'hybrid:watchlist?tracker=trakt&type=movie',
    clientFilter: '{"availableOn":"vod"}',
    requiresDelegate: true,
  },
  {
    id: 'hybrid-watchlist-server-movies',
    type: 'movie',
    name: 'Trakt Watchlist · On Home Server',
    category: 'hybrid',
    description: 'Trakt Watchlist movies verified on-device to be on your Jellyfin/Emby/Plex server.',
    clientDelegate: 'hybrid:watchlist?tracker=trakt&type=movie',
    clientFilter: '{"availableOn":"homeserver"}',
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

function json(payload, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
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
    catalogs: selected.map(({ id, type, name, clientDelegate, clientFilter }) => ({
      id,
      type,
      name,
      ...(clientDelegate ? { clientDelegate } : {}),
      ...(clientFilter ? { clientFilter } : {}),
    })),
  };
}

async function readJson(request) {
  let body = '';
  if (typeof request.text === 'function') {
    body = await request.text();
  } else {
    for await (const chunk of request) body += chunk;
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new RequestError(400, 'Invalid JSON body.');
  }
}

export function createAddonHandler({
  token = process.env.TMDB_READ_TOKEN,
  fetcher = fetch,
  networkAddress,
  configStore = new ConfigStore(new URL('./data/configs.json', import.meta.url).pathname),
  arvioBackendUrl = process.env.ARVIO_BACKEND_URL || 'https://auth.arvio.tv/.netlify/functions',
  arvioAnonKey = process.env.ARVIO_APP_ANON_KEY || '',
} = {}) {
  const cache = new Map();

  let blobsStorePromise = null;
  async function getBlobsStore() {
    if (blobsStorePromise) return blobsStorePromise;
    blobsStorePromise = (async () => {
      try {
        const { getStore } = await import('@netlify/blobs');
        return getStore('addon-configs');
      } catch {
        return null;
      }
    })();
    return blobsStorePromise;
  }

  async function getProfileConfig(profileId) {
    const blobs = await getBlobsStore();
    if (blobs) {
      try {
        const val = await blobs.get(profileId, { type: 'json' });
        if (Array.isArray(val)) return val;
        if (val?.selectedIds) return val.selectedIds;
      } catch {
        // Fall back to configStore
      }
    }
    return configStore.get(profileId);
  }

  async function setProfileConfig(profileId, selectedIds) {
    configStore.set(profileId, selectedIds);
    const blobs = await getBlobsStore();
    if (blobs) {
      try {
        await blobs.setJSON(profileId, selectedIds);
      } catch (e) {
        console.warn('Failed to save to Netlify Blobs:', e.message);
      }
    }
  }

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

  return async function handleRequest(request) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          },
        });
      }

      const url = new URL(request.url, 'http://localhost');
      const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);

      // --- API Endpoints ---
      if (parts[0] === 'api') {
        // GET /api/config/:profileId
        // POST /api/config/:profileId
        if (parts[1] === 'config' && parts[2]) {
          const profileId = parts[2];
          if (request.method === 'GET') {
            const stored = await getProfileConfig(profileId);
            const selectedIds = stored || catalogs.filter((r) => r.isDefault).map((r) => r.id);
            return json({ profileId, selectedIds }, 200);
          }
          if (request.method === 'POST') {
            const body = await readJson(request);
            const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds : [];
            await setProfileConfig(profileId, selectedIds);
            return json({ ok: true, profileId, selectedIds, count: selectedIds.length }, 200);
          }
        }

        // POST /api/arvio/login
        if (parts[1] === 'arvio' && parts[2] === 'login' && request.method === 'POST') {
          const { email, password } = await readJson(request);
          if (!email || !password) throw new RequestError(400, 'Email and password are required.');

          const authRes = await fetcher(`${arvioBackendUrl}/auth-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: arvioAnonKey,
              Authorization: `Bearer ${arvioAnonKey}`,
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(10000),
          });
          const authData = await authRes.json();
          if (!authRes.ok) {
            throw new RequestError(authRes.status || 401, authData.message || authData.error || 'ARVIO login failed.');
          }

          const token = authData.access_token;
          const user = authData.user || { email, id: authData.id || email };

          let profiles = [];
          let activeProfileId = null;
          try {
            const syncRes = await fetcher(`${arvioBackendUrl}/account-sync-pull`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: arvioAnonKey,
                Authorization: `Bearer ${token}`,
              },
              signal: AbortSignal.timeout(10000),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              const payload = syncData.payload || {};
              profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
              activeProfileId = payload.activeProfileId || (profiles[0]?.id ?? null);
            }
          } catch (e) {
            console.warn('Could not pull account sync profiles:', e.message);
          }

          if (!profiles.length) {
            profiles = [{ id: 'default', name: user.email.split('@')[0] || 'Default' }];
            activeProfileId = 'default';
          }

          return json({
            ok: true,
            token,
            user: { id: user.id, email: user.email },
            profiles,
            activeProfileId,
          }, 200);
        }

        // POST /api/arvio/sync
        if (parts[1] === 'arvio' && parts[2] === 'sync' && request.method === 'POST') {
          const { token, profileId, manifestUrl, selectedIds } = await readJson(request);
          if (!token || !profileId) throw new RequestError(400, 'Token and profileId are required.');

          if (Array.isArray(selectedIds)) {
            await setProfileConfig(profileId, selectedIds);
          }

          // Pull current sync state from ARVIO
          const pullRes = await fetcher(`${arvioBackendUrl}/account-sync-pull`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: arvioAnonKey,
              Authorization: `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!pullRes.ok) {
            throw new RequestError(pullRes.status || 500, 'Failed to fetch current ARVIO profile sync state.');
          }

          const pullData = await pullRes.json();
          const payload = pullData.payload || {};
          const effectiveSelectedIds = Array.isArray(selectedIds)
            ? selectedIds
            : (await getProfileConfig(profileId)) || catalogs.filter((r) => r.isDefault).map((r) => r.id);
          const selectedRows = catalogs.filter(({ id }) => effectiveSelectedIds.includes(id));
          const selectedManifest = manifest(selectedRows);
          const now = Date.now();
          const baseUrl = String(manifestUrl || '').replace(/\/manifest\.json(\?.*)?$/i, '').replace(/\/+$/, '');
          const normalizedMetaKey = baseUrl.toLowerCase();

          // Update addonsByProfile[profileId]
          const addonsByProfile = payload.addonsByProfile || {};
          const profileAddons = Array.isArray(addonsByProfile[profileId]) ? [...addonsByProfile[profileId]] : [];
          const rootAddons = Array.isArray(payload.addons) ? [...payload.addons] : [];

          const matchesDiscoverAddon = (a) => a && (
            a.id === 'tv.arvio.discover' ||
            String(a.id || '').startsWith('tv.arvio.discover_') ||
            a.url === manifestUrl ||
            a.manifestUrl === manifestUrl
          );
          const existingProfileEntry = profileAddons.find(matchesDiscoverAddon);
          const existingRootEntry = rootAddons.find(matchesDiscoverAddon);
          const existingEntry = existingProfileEntry || existingRootEntry;
          const discoverId = existingEntry?.id || 'tv.arvio.discover';

          const discoverEntry = {
            ...(existingEntry || {}),
            id: discoverId,
            name: existingEntry?.name || 'ARVIO Discover',
            version: selectedManifest.version,
            description: selectedManifest.description,
            url: manifestUrl,
            manifestUrl,
            transportUrl: baseUrl,
            isInstalled: true,
            isEnabled: existingEntry?.isEnabled ?? existingEntry?.enabled ?? true,
            type: existingEntry?.type || 'CUSTOM',
            runtimeKind: existingEntry?.runtimeKind || 'STREMIO',
            installSource: existingEntry?.installSource || 'DIRECT_URL',
            setupUpdatedAt: now,
            metadataUpdatedAt: now,
            catalogs: selectedManifest.catalogs,
            resources: selectedManifest.resources,
            types: selectedManifest.types,
            idPrefixes: [prefix],
            manifest: {
              ...selectedManifest,
              resources: selectedManifest.resources.map((r) =>
                typeof r === 'string'
                  ? { name: r, types: [], idPrefixes: null }
                  : { name: r.name, types: r.types || [], idPrefixes: r.idPrefixes || null }
              ),
            },
          };

          const existingIndex = profileAddons.findIndex(matchesDiscoverAddon);
          if (existingIndex >= 0) {
            profileAddons[existingIndex] = discoverEntry;
          } else {
            profileAddons.push(discoverEntry);
          }
          addonsByProfile[profileId] = profileAddons;
          payload.addonsByProfile = addonsByProfile;

          // Also ensure root addons and separate metadata cache are updated
          const rootIdx = rootAddons.findIndex(matchesDiscoverAddon);
          if (rootIdx >= 0) {
            rootAddons[rootIdx] = discoverEntry;
          } else {
            rootAddons.push(discoverEntry);
          }
          payload.addons = rootAddons;
          payload.addonsUpdatedAt = now;
          payload.addonChanges = {
            ...(payload.addonChanges && typeof payload.addonChanges === 'object' ? payload.addonChanges : {}),
            [discoverId]: { removed: false, updatedAt: now },
          };
          if (normalizedMetaKey) {
            payload.addonMetadataByKey = {
              ...(payload.addonMetadataByKey && typeof payload.addonMetadataByKey === 'object' ? payload.addonMetadataByKey : {}),
              [normalizedMetaKey]: {
                manifest: discoverEntry.manifest,
                catalogs: discoverEntry.catalogs,
                resources: discoverEntry.resources,
                metadataUpdatedAt: now,
              },
            };
          }

          // Push updated state back to ARVIO Cloud
          const pushRes = await fetcher(`${arvioBackendUrl}/account-sync-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: arvioAnonKey,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ payload }),
            signal: AbortSignal.timeout(10000),
          });

          const pushData = await pushRes.json();
          if (!pushRes.ok || pushData.accepted === false) {
            throw new RequestError(pushRes.status || 500, pushData.reason || 'ARVIO cloud sync rejected update.');
          }

          return json({
            ok: true,
            profileId,
            manifestUrl,
            syncedAt: Date.now(),
          }, 200);
        }

        throw new RequestError(404, 'API endpoint not found.');
      }

      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Use GET.' }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Allow: 'GET, POST, OPTIONS',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // --- Scope Resolution (Profile / Inline / Default) ---
      let currentProfileId = 'default';
      let selectedIds = null;

      if (parts[0] === 'p' && parts[1]) {
        currentProfileId = parts[1];
        parts.splice(0, 2);
        selectedIds = await getProfileConfig(currentProfileId);
      } else if (parts[0] === 'c' && parts[1]) {
        selectedIds = parts.splice(0, 2)[1]?.split(',');
      } else {
        selectedIds = await getProfileConfig('default');
      }

      const selected = selectedIds
        ? catalogs.filter(({ id }) => selectedIds.includes(id))
        : catalogs.filter((row) => row.isDefault);

      if (!selected.length || (selectedIds && selected.length !== selectedIds.length)) {
        throw new RequestError(404, 'Unknown catalog selection.');
      }

      // Configure UI
      if (parts.length === 1 && ['', 'configure'].includes(parts[0])) {
        const netOrigin = networkAddress ? `http://${networkAddress}:${url.port || (url.protocol === 'https:' ? 443 : 80)}` : '';
        return new Response(configurePage(catalogs, selected, Boolean(token), netOrigin, currentProfileId), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Manifest (profile-scoped manifests use no-store so live config changes apply immediately on refresh)
      if (parts.length === 1 && parts[0] === 'manifest.json') {
        const cacheSeconds = currentProfileId !== 'default' ? 0 : 300;
        return json(manifest(selected), 200, cacheSeconds);
      }

      // Catalog & Meta resources
      const [resource, type, filename] = parts;
      if (parts.length === 3 && types.includes(type) && filename.endsWith('.json')) {
        const id = filename.slice(0, -5);
        if (resource === 'catalog') {
          const catalog = selected.find((row) => row.id === id && row.type === type);
          if (catalog?.requiresDelegate) {
            return json({
              metas: [],
              clientDelegate: catalog.clientDelegate,
              note: 'Resolved locally on-device by updated ARVIO clients.',
            }, 200, 0);
          }
          if (catalog) return json({ metas: await loadCatalog(catalog) }, 200, 300);
        }

        if (resource === 'meta' && id.startsWith(prefix) && /^[1-9]\d{0,9}$/.test(id.slice(prefix.length))) {
          const providerType = type === 'movie' ? 'movie' : 'tv';
          const title = await tmdb(`/${providerType}/${id.slice(prefix.length)}?append_to_response=external_ids`);
          const meta = title && metadata(title, type);
          if (!meta) throw new RequestError(502, 'TMDB returned invalid metadata.');
          return json({ meta }, 200, 3600);
        }
      }

      throw new RequestError(404, 'Resource not found.');
    } catch (error) {
      if (error instanceof URIError) return json({ error: 'Invalid URL encoding.' }, 400);
      const status = error instanceof RequestError ? error.status : 500;
      return json({ error: status === 500 ? 'Unexpected server error.' : error.message }, status);
    }
  };
}

async function nodeToWebRequest(nodeReq) {
  const protocol = nodeReq.headers['x-forwarded-proto'] || (nodeReq.socket?.encrypted ? 'https' : 'http');
  const host = nodeReq.headers['x-forwarded-host'] || nodeReq.headers.host || 'localhost';
  const url = new URL(nodeReq.url, `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  let body = null;
  if (!['GET', 'HEAD'].includes(nodeReq.method)) {
    const chunks = [];
    for await (const chunk of nodeReq) {
      chunks.push(chunk);
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks);
    }
  }

  return new Request(url, {
    method: nodeReq.method,
    headers,
    body,
    duplex: 'half',
  });
}

async function webToNodeResponse(webRes, nodeRes) {
  nodeRes.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    nodeRes.setHeader(key, value);
  });
  const buf = Buffer.from(await webRes.arrayBuffer());
  nodeRes.end(buf);
}

export function createAddonServer(options = {}) {
  const handler = createAddonHandler(options);
  return createServer(async (nodeReq, nodeRes) => {
    try {
      const webReq = await nodeToWebRequest(nodeReq);
      const webRes = await handler(webReq);
      await webToNodeResponse(webRes, nodeRes);
    } catch (err) {
      if (!nodeRes.headersSent) {
        nodeRes.statusCode = 500;
        nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8');
        nodeRes.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      }
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
