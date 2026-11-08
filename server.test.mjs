import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createAddonServer } from './server.mjs';

async function start(t, options) {
  const server = createAddonServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return (path) => fetch(`http://127.0.0.1:${server.address().port}${path}`);
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
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
