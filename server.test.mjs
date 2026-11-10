import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createAddonServer } from './server.mjs';

async function start(t, options) {
  const server = createAddonServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}

test('a configured manifest serves only its selected rows and resolves their title metadata', async (t) => {
  const calls = [];
  const get = await start(t, {
    token: 'test-token',
    fetcher: async (url, options) => {
      calls.push(url.pathname);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      const show = { id: 41, name: 'Example Show', poster_path: '/example.jpg', first_air_date: '2023-05-01' };
      return Response.json(url.pathname === '/3/trending/tv/week'
        ? { results: [show, { ...show, id: 42, adult: true }] }
        : { ...show, external_ids: { imdb_id: 'tt1234567' } });
    },
  });
  const base = '/c/trending-shows';
  const manifestResponse = await get(`${base}/manifest.json`);
  assert.equal(manifestResponse.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual((await manifestResponse.json()).catalogs.map((row) => row.id), ['trending-shows']);
  assert.equal((await get(`${base}/catalog/movie/trending-movies.json`)).status, 404);

  const url = `${base}/catalog/series/trending-shows.json`;
  const { metas } = await (await get(url)).json();
  assert.equal(metas.length, 1);
  assert.equal(metas[0].tmdb_id, '41');
  assert.equal(metas[0].name, 'Example Show');
  assert.equal((await get(url)).status, 200);
  const metaResponse = await get(`${base}/meta/series/${encodeURIComponent(metas[0].id)}.json`);
  assert.equal((await metaResponse.json()).meta.imdb_id, 'tt1234567');
  assert.deepEqual(calls, ['/3/trending/tv/week', '/3/tv/41']);
});

test('configuration works without credentials and catalog requests explain the missing token', async (t) => {
  const get = await start(t, { token: '' });
  assert.match(await (await get('/configure')).text(), /TMDB_READ_TOKEN/);
  assert.equal((await get('/manifest.json')).status, 200);
  assert.equal((await get('/c/unknown/manifest.json')).status, 404);
  assert.equal((await get('/catalog/movie/trending-movies.json')).status, 503);
});

test('connected tracker and home server rows declare clientDelegate in manifest and are resolved locally', async (t) => {
  const get = await start(t, {
    token: 'test-token',
    fetcher: async () => assert.fail('A private delegated row must not call the remote metadata provider'),
  });
  const defaults = await (await get('/manifest.json')).json();
  assert.equal(defaults.catalogs.length, 7); // Default public catalogs

  const base = '/c/trakt-watchlist-movies,trakt-watchlist-shows,simkl-plan-movies,homeserver-movies';
  const configured = await (await get(`${base}/manifest.json`)).json();
  assert.deepEqual(configured.catalogs.map(({ id, type, clientDelegate }) => [id, type, clientDelegate]), [
    ['trakt-watchlist-movies', 'movie', 'trakt:watchlist?type=movie'],
    ['trakt-watchlist-shows', 'series', 'trakt:watchlist?type=tv'],
    ['simkl-plan-movies', 'movie', 'simkl:plantowatch?type=movie'],
    ['homeserver-movies', 'movie', 'homeserver:library?type=movie'],
  ]);

  for (const { id, type } of configured.catalogs) {
    const response = await get(`${base}/catalog/${type}/${id}.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.deepEqual(body.metas, []);
  }
});

test('streaming provider catalogs resolve via TMDB discover endpoint with provider filtering', async (t) => {
  const queriedPaths = [];
  const get = await start(t, {
    token: 'test-token',
    fetcher: async (url) => {
      queriedPaths.push(url.pathname + '?' + url.searchParams.toString());
      const movie = { id: 99, title: 'Netflix Film', poster_path: '/netflix.jpg', release_date: '2024-01-01' };
      return Response.json({ results: [movie] });
    },
  });

  const base = '/c/netflix-movies';
  const manifest = await (await get(`${base}/manifest.json`)).json();
  assert.equal(manifest.catalogs[0].id, 'netflix-movies');

  const { metas } = await (await get(`${base}/catalog/movie/netflix-movies.json`)).json();
  assert.equal(metas.length, 1);
  assert.equal(metas[0].name, 'Netflix Film');
  assert.equal(metas[0].tmdb_id, '99');

  assert.equal(queriedPaths.length, 1);
  assert.match(queriedPaths[0], /\/3\/discover\/movie/);
  assert.match(queriedPaths[0], /with_watch_providers=8/);
});

test('vod and hybrid catalogs declare clientDelegate and clientFilter in manifest and return empty fallback when direct-accessed', async (t) => {
  const queriedPaths = [];
  const get = await start(t, {
    token: 'test-token',
    fetcher: async (url) => {
      queriedPaths.push(url.pathname);
      return Response.json({
        results: [{ id: 101, title: 'Trending Film', poster_path: '/trend.jpg', release_date: '2025-01-01' }],
      });
    },
  });

  const base = '/c/vod-recent-movies,vod-recent-shows,hybrid-trending-vod-movies,hybrid-watchlist-vod-movies,hybrid-watchlist-server-movies';
  const manifest = await (await get(`${base}/manifest.json`)).json();

  assert.deepEqual(
    manifest.catalogs.map(({ id, type, clientDelegate, clientFilter }) => ({
      id,
      type,
      ...(clientDelegate ? { clientDelegate } : {}),
      ...(clientFilter ? { clientFilter } : {}),
    })),
    [
      {
        id: 'vod-recent-movies',
        type: 'movie',
        clientDelegate: 'vod:recent?type=movie',
      },
      {
        id: 'vod-recent-shows',
        type: 'series',
        clientDelegate: 'vod:recent?type=series',
      },
      {
        id: 'hybrid-trending-vod-movies',
        type: 'movie',
        clientFilter: '{"availableOn":"vod"}',
      },
      {
        id: 'hybrid-watchlist-vod-movies',
        type: 'movie',
        clientDelegate: 'hybrid:watchlist?tracker=trakt&type=movie',
        clientFilter: '{"availableOn":"vod"}',
      },
      {
        id: 'hybrid-watchlist-server-movies',
        type: 'movie',
        clientDelegate: 'hybrid:watchlist?tracker=trakt&type=movie',
        clientFilter: '{"availableOn":"homeserver"}',
      },
    ]
  );

  for (const { id, type } of manifest.catalogs.filter((c) => c.id !== 'hybrid-trending-vod-movies')) {
    const response = await get(`${base}/catalog/${type}/${id}.json`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.metas, []);
    assert.ok(body.clientDelegate);
  }
  assert.equal(queriedPaths.length, 0);

  const hybridHttpRes = await get(`${base}/catalog/movie/hybrid-trending-vod-movies.json`);
  assert.equal(hybridHttpRes.status, 200);
  const hybridHttpBody = await hybridHttpRes.json();
  assert.equal(hybridHttpBody.metas.length, 1);
  assert.equal(hybridHttpBody.metas[0].name, 'Trending Film');
  assert.equal(queriedPaths[0], '/3/trending/movie/week');
});

test('profile-scoped configurations update dynamically without changing manifest URL', async (t) => {
  const { ConfigStore } = await import('./server.mjs');
  const store = new ConfigStore(); // in-memory store
  const request = await start(t, {
    token: 'test-token',
    configStore: store,
  });

  // 1. Initial manifest for profile "himanth" defaults to core rows
  const initialManifest = await (await request('/p/himanth/manifest.json')).json();
  assert.equal(initialManifest.catalogs.length, 7);

  // 2. User customizes profile "himanth" via API
  const saveRes = await request('/api/config/himanth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedIds: ['netflix-movies', 'vod-recent-movies'] }),
  });
  assert.equal(saveRes.status, 200);
  const saveJson = await saveRes.json();
  assert.equal(saveJson.ok, true);
  assert.equal(saveJson.count, 2);

  // 3. The exact same manifest URL now immediately returns the 2 updated rows!
  const updatedManifest = await (await request('/p/himanth/manifest.json')).json();
  assert.deepEqual(
    updatedManifest.catalogs.map((c) => c.id),
    ['netflix-movies', 'vod-recent-movies']
  );

  // 4. Checking config endpoint
  const getRes = await (await request('/api/config/himanth')).json();
  assert.deepEqual(getRes.selectedIds, ['netflix-movies', 'vod-recent-movies']);
});

test('arvio direct login and cloud profile sync pushes addon directly to TV profile', async (t) => {
  const pushedPayloads = [];
  const request = await start(t, {
    token: 'test-token',
    arvioBackendUrl: 'https://auth.mock.arvio',
    arvioAnonKey: 'mock-anon-key',
    fetcher: async (url, options) => {
      const path = url.toString();
      if (path.includes('/auth-login')) {
        const body = JSON.parse(options.body);
        assert.equal(body.email, 'test@example.com');
        assert.equal(body.password, 'secret');
        return Response.json({
          access_token: 'mock-arvio-jwt',
          user: { id: 'usr-123', email: 'test@example.com' },
        });
      }
      if (path.includes('/account-sync-pull')) {
        assert.equal(options.headers.Authorization, 'Bearer mock-arvio-jwt');
        return Response.json({
          payload: {
            profiles: [
              { id: 'prof-living-room', name: 'Living Room' },
              { id: 'prof-kids', name: 'Kids' },
            ],
            activeProfileId: 'prof-living-room',
            addonsByProfile: {},
            addons: [],
          },
        });
      }
      if (path.includes('/account-sync-push')) {
        const body = JSON.parse(options.body);
        pushedPayloads.push(body.payload);
        return Response.json({ accepted: true });
      }
      assert.fail(`Unexpected network call: ${path}`);
    },
  });

  // 1. Log in to ARVIO
  const loginRes = await request('/api/arvio/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'secret' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.ok, true);
  assert.equal(loginData.token, 'mock-arvio-jwt');
  assert.equal(loginData.profiles.length, 2);
  assert.equal(loginData.activeProfileId, 'prof-living-room');

  // 2. Sync selected rows to Living Room profile
  const syncRes = await request('/api/arvio/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: loginData.token,
      profileId: 'prof-living-room',
      manifestUrl: 'http://127.0.0.1:8787/p/prof-living-room/manifest.json',
      selectedIds: ['trending-movies', 'prime-movies'],
    }),
  });
  assert.equal(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.equal(syncData.ok, true);

  // 3. Verify pushed cloud payload contains full discover entry + separate metadata cache + addonChanges
  assert.equal(pushedPayloads.length, 1);
  const pushed = pushedPayloads[0];
  const profileAddons = pushed.addonsByProfile['prof-living-room'];
  assert.equal(profileAddons.length, 1);
  assert.equal(profileAddons[0].id, 'tv.arvio.discover');
  assert.equal(profileAddons[0].url, 'http://127.0.0.1:8787/p/prof-living-room/manifest.json');
  assert.equal(profileAddons[0].manifestUrl, 'http://127.0.0.1:8787/p/prof-living-room/manifest.json');
  assert.deepEqual(
    profileAddons[0].manifest.catalogs.map((c) => c.id),
    ['trending-movies', 'prime-movies']
  );
  assert.ok(profileAddons[0].setupUpdatedAt > 0);
  assert.ok(profileAddons[0].metadataUpdatedAt > 0);
  assert.equal(pushed.addonChanges['tv.arvio.discover'].removed, false);
  const metadataEntry = pushed.addonMetadataByKey['http://127.0.0.1:8787/p/prof-living-room'];
  assert.ok(metadataEntry);
  assert.deepEqual(
    metadataEntry.manifest.catalogs.map((c) => c.id),
    ['trending-movies', 'prime-movies']
  );
});

test('arvio cloud profile sync preserves existing hashed discover addon id', async (t) => {
  const pushedPayloads = [];
  const request = await start(t, {
    token: 'test-token',
    arvioBackendUrl: 'https://auth.mock.arvio',
    arvioAnonKey: 'mock-anon-key',
    fetcher: async (url, options) => {
      const path = url.toString();
      if (path.includes('/account-sync-pull')) {
        return Response.json({
          payload: {
            profiles: [{ id: 'p1', name: 'TV' }],
            activeProfileId: 'p1',
            addonsByProfile: {
              p1: [
                {
                  id: 'tv.arvio.discover_caffa292bf26',
                  name: 'ARVIO Discover',
                  url: 'https://arvio-addon.netlify.app/p/p1/manifest.json',
                  isInstalled: true,
                  isEnabled: true,
                },
              ],
            },
            addons: [],
          },
        });
      }
      if (path.includes('/account-sync-push')) {
        pushedPayloads.push(JSON.parse(options.body).payload);
        return Response.json({ accepted: true });
      }
      assert.fail(`Unexpected network call: ${path}`);
    },
  });

  const syncRes = await request('/api/arvio/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'jwt',
      profileId: 'p1',
      manifestUrl: 'https://arvio-addon.netlify.app/p/p1/manifest.json',
      selectedIds: ['vod-recent-movies'],
    }),
  });
  assert.equal(syncRes.status, 200);
  assert.equal(pushedPayloads.length, 1);
  const p1Addons = pushedPayloads[0].addonsByProfile.p1;
  assert.equal(p1Addons.length, 1);
  assert.equal(p1Addons[0].id, 'tv.arvio.discover_caffa292bf26');
  assert.equal(p1Addons[0].manifest.catalogs[0].clientDelegate, 'vod:recent?type=movie');
  assert.equal(pushedPayloads[0].addonChanges['tv.arvio.discover_caffa292bf26'].removed, false);
});

test('createAddonHandler serves serverless Web Requests directly with Web Responses', async () => {
  const { createAddonHandler } = await import('./server.mjs');
  const handler = createAddonHandler({ token: 'test-token' });

  // 1. Manifest
  const manifestReq = new Request('https://addon.arvio.tv/manifest.json');
  const manifestRes = await handler(manifestReq);
  assert.equal(manifestRes.status, 200);
  assert.equal(manifestRes.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(manifestRes.headers.get('access-control-allow-origin'), '*');
  const manifestJson = await manifestRes.json();
  assert.equal(manifestJson.id, 'tv.arvio.discover');

  // 2. Configure page HTML
  const configReq = new Request('https://addon.arvio.tv/configure');
  const configRes = await handler(configReq);
  assert.equal(configRes.status, 200);
  assert.match(configRes.headers.get('content-type'), /text\/html/);
  assert.match(await configRes.text(), /ARVIO Discover/);

  // 3. CORS preflight OPTIONS
  const optionsReq = new Request('https://addon.arvio.tv/manifest.json', { method: 'OPTIONS' });
  const optionsRes = await handler(optionsReq);
  assert.equal(optionsRes.status, 204);
  assert.equal(optionsRes.headers.get('access-control-allow-origin'), '*');
});


test('snapshot mode extracts safe per-profile integrations and serves custom Home Server library rows', async (t) => {
  let activePayload = {
    updatedAt: 1794320000000,
    profiles: [
      { id: 'p-home', name: 'Home Theater' },
      { id: 'p-clean', name: 'Guest' },
    ],
    activeProfileId: 'p-home',
    traktTokens: { 'p-home': { accessToken: 'secret-trakt-tok' } },
    simklTokens: { 'p-home': { access_token: 'secret-simkl-tok' } },
    iptvByProfile: {
      'p-home': {
        playlists: [{ name: 'Living Room IPTV', m3uUrl: 'http://secret.iptv/list.m3u' }],
      },
    },
    profileSettingsById: {
      'p-home': {
        homeServerConnectionJson: JSON.stringify({
          connections: [
            {
              enabled: true,
              connectionId: 'conn-1',
              serverId: 'srv-plex-99',
              serverName: 'Family Plex',
              serverKind: 'PLEX',
              serverUrl: 'http://192.168.1.50:32400',
              accessToken: 'plex-secret-token',
              collections: [
                { id: '1', name: '4K Movies', type: 'movie', enabled: true },
                { id: '2', name: 'Anime Shows', type: 'show', enabled: true },
                { id: '3', name: 'Hidden Folder', type: 'movie', enabled: false },
              ],
            },
          ],
        }),
      },
    },
    addonsByProfile: {},
    addons: [],
  };

  const pushedPayloads = [];
  const request = await start(t, {
    token: 'test-token',
    arvioBackendUrl: 'https://auth.mock.arvio',
    arvioAnonKey: 'mock-anon-key',
    fetcher: async (url, options) => {
      const p = url.toString();
      if (p.includes('/auth-login')) {
        return Response.json({ access_token: 'arvio-jwt', user: { id: 'u1', email: 'me@example.com' } });
      }
      if (p.includes('/account-sync-pull')) {
        return Response.json({ payload: activePayload });
      }
      if (p.includes('/account-sync-push')) {
        pushedPayloads.push(JSON.parse(options.body).payload);
        return Response.json({ accepted: true });
      }
      assert.fail(`Unexpected fetch: ${p}`);
    },
  });

  // 1. Login returns safe snapshots without leaking secrets or URLs
  const loginRes = await request('/api/arvio/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'me@example.com', password: 'pw' }),
  });
  assert.equal(loginRes.status, 200);
  const loginBody = await loginRes.json();
  const rawLoginStr = JSON.stringify(loginBody);
  assert.equal(rawLoginStr.includes('secret-trakt-tok'), false);
  assert.equal(rawLoginStr.includes('secret-simkl-tok'), false);
  assert.equal(rawLoginStr.includes('plex-secret-token'), false);
  assert.equal(rawLoginStr.includes('192.168.1.50'), false);
  assert.equal(rawLoginStr.includes('secret.iptv'), false);

  const homeSnap = loginBody.profileSnapshots['p-home'];
  assert.equal(homeSnap.trakt.active, true);
  assert.equal(homeSnap.simkl.active, true);
  assert.equal(homeSnap.vod.active, true);
  assert.deepEqual(homeSnap.vod.playlistNames, ['Living Room IPTV']);
  assert.equal(homeSnap.homeServerCatalogs.length, 2); // disabled folder omitted
  assert.equal(homeSnap.homeServerCatalogs[0].name, 'Family Plex · 4K Movies');
  assert.equal(homeSnap.homeServerCatalogs[0].type, 'movie');
  assert.equal(homeSnap.homeServerCatalogs[1].name, 'Family Plex · Anime Shows');
  assert.equal(homeSnap.homeServerCatalogs[1].type, 'series');

  // Verify the generated Home Server delegate URL contains encoded home_server_catalog source
  const movieDelegate = new URL(homeSnap.homeServerCatalogs[0].clientDelegate);
  assert.equal(movieDelegate.protocol, 'homeserver:');
  assert.equal(movieDelegate.searchParams.get('type'), 'movie');
  assert.equal(movieDelegate.searchParams.get('source'), 'home_server_catalog|srv-plex-99|1|movie');

  const guestSnap = loginBody.profileSnapshots['p-clean'];
  assert.equal(guestSnap.trakt.active, false);
  assert.equal(guestSnap.simkl.active, false);
  assert.equal(guestSnap.vod.active, false);
  assert.equal(guestSnap.homeServerCatalogs.length, 0);

  // 2. Sync selected snapshot Home Server + SIMKL rows -> manifest persists & serves them dynamically
  const chosenHsIds = homeSnap.homeServerCatalogs.map((c) => c.id);
  const syncRes = await request('/api/arvio/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'arvio-jwt',
      profileId: 'p-home',
      manifestUrl: 'https://arvio-addon.netlify.app/p/p-home/manifest.json',
      selectedIds: [...chosenHsIds, 'simkl-plan-movies'],
      customCatalogs: homeSnap.homeServerCatalogs,
    }),
  });
  assert.equal(syncRes.status, 200);
  assert.equal(pushedPayloads.length, 1);
  const manifestCatalogs = pushedPayloads[0].addonsByProfile['p-home'][0].manifest.catalogs;
  assert.equal(manifestCatalogs.length, 3);
  assert.equal(manifestCatalogs[0].name, 'Family Plex · 4K Movies');
  assert.match(manifestCatalogs[0].clientDelegate, /^homeserver:library\?type=movie&source=home_server_catalog/);

  // 3. Subsequent manifest fetch for /p/p-home/manifest.json serves those custom rows even offline from auth
  const liveManifest = await (await request('/p/p-home/manifest.json')).json();
  assert.deepEqual(liveManifest.catalogs.map((c) => c.name), [
    'Family Plex · 4K Movies',
    'Family Plex · Anime Shows',
    'SIMKL Plan to Watch · Movies',
  ]);

  // 4. Refresh snapshot after connecting an extra Jellyfin server reflects new snapshot state immediately
  activePayload = {
    ...activePayload,
    updatedAt: 1794321000000,
    profileSettingsById: {
      'p-home': {
        homeServerConnectionJson: JSON.stringify({
          connections: [
            ...JSON.parse(activePayload.profileSettingsById['p-home'].homeServerConnectionJson).connections,
            {
              enabled: true,
              connectionId: 'jf-conn-2',
              serverName: 'Basement Jellyfin',
              serverKind: 'JELLYFIN',
              serverUrl: 'http://10.0.0.5:8096',
              accessToken: 'jf-secret',
              collections: [{ id: 'col-doc', name: 'Documentaries', type: 'movie', enabled: true }],
            },
          ],
        }),
      },
    },
  };
  const refreshRes = await request('/api/arvio/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'arvio-jwt' }),
  });
  assert.equal(refreshRes.status, 200);
  const refreshBody = await refreshRes.json();
  assert.equal(refreshBody.profileSnapshots['p-home'].homeServerCatalogs.length, 3);
  assert.equal(refreshBody.profileSnapshots['p-home'].homeServerCatalogs[2].name, 'Basement Jellyfin · Documentaries');
});
