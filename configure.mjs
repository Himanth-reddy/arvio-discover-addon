export function configurePage(catalogs, selected, hasToken, networkOrigin) {
  const categories = [
    { id: 'all', name: 'All Catalogs' },
    { id: 'public', name: 'General Trends' },
    { id: 'streaming', name: 'Streaming Networks' },
    { id: 'curated', name: 'Curated & Franchises' },
    { id: 'vod', name: 'IPTV / VOD' },
    { id: 'hybrid', name: 'Hybrid & Cross-Filtered' },
    { id: 'trakt', name: 'Trakt' },
    { id: 'simkl', name: 'SIMKL' },
    { id: 'homeserver', name: 'Home Servers' },
  ];

  const categoryCards = catalogs.map((cat) => {
    const isSelected = selected.some((row) => row.id === cat.id);
    const badge = cat.clientDelegate
      ? `<span class="badge delegate-badge">${cat.clientDelegate.split(':')[0].toUpperCase()} DELEGATED</span>`
      : `<span class="badge public-badge">PUBLIC</span>`;
    const typeBadge = `<span class="badge type-badge">${cat.type.toUpperCase()}</span>`;

    return `
      <div class="catalog-card" data-category="${cat.category || 'public'}" data-id="${cat.id}">
        <div class="card-head">
          <label class="card-label">
            <input type="checkbox" value="${cat.id}" ${isSelected ? 'checked' : ''} class="catalog-checkbox">
            <span class="card-title">${cat.name}</span>
          </label>
          <div class="badges">
            ${badge}
            ${typeBadge}
          </div>
        </div>
        <p class="card-desc">${cat.description || ''}</p>
        <div class="card-actions">
          ${cat.requiresDelegate
            ? `<div class="delegate-hint">🔒 Resolved locally on-device by ARVIO. Zero credentials shared.</div>`
            : `<button type="button" class="preview-btn" data-path="/catalog/${cat.type}/${cat.id}.json">Preview Titles</button>`}
        </div>
        <div class="preview-container" aria-live="polite"></div>
      </div>
    `;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ARVIO Discover · Stremio Addon Configurator</title>
<style>
  :root {
    color-scheme: dark;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #0b0c10;
    color: #e6e8ec;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    padding: 40px 20px;
    min-height: 100vh;
  }
  main {
    max-width: 900px;
    margin: 0 auto;
  }
  header {
    margin-bottom: 32px;
  }
  .brand-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: #2563eb;
    border-radius: 8px;
    color: #fff;
    font-weight: 800;
    font-size: 18px;
  }
  h1 {
    font-size: 26px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.02em;
  }
  .subtitle {
    color: #9ca3af;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 20px;
  }
  .info-banner {
    background: rgba(37, 99, 235, 0.1);
    border: 1px solid rgba(37, 99, 235, 0.25);
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 24px;
    font-size: 13px;
    color: #93c5fd;
    line-height: 1.5;
  }
  .presets-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    background: #14161f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 20px;
  }
  .presets-label {
    font-size: 13px;
    font-weight: 600;
    color: #e5e7eb;
    margin-right: 4px;
  }
  .preset-btn {
    background: #1e2230;
    color: #d1d5db;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 120ms ease;
  }
  .preset-btn:hover {
    background: #2b3247;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .tab-button {
    background: #161821;
    color: #9ca3af;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 120ms ease;
  }
  .tab-button:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .tab-button.active {
    background: #2563eb;
    color: #fff;
    border-color: #3b82f6;
  }
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }
  .catalog-card {
    background: #14161f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
    transition: border-color 140ms ease;
  }
  .catalog-card:hover {
    border-color: rgba(255, 255, 255, 0.16);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .card-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }
  .catalog-checkbox {
    width: 18px;
    height: 18px;
    accent-color: #2563eb;
    cursor: pointer;
  }
  .badges {
    display: flex;
    gap: 6px;
  }
  .badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.03em;
  }
  .delegate-badge {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }
  .public-badge {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .type-badge {
    background: rgba(255, 255, 255, 0.08);
    color: #9ca3af;
  }
  .card-desc {
    color: #9ca3af;
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 12px;
  }
  .card-actions {
    display: flex;
    align-items: center;
  }
  .delegate-hint {
    font-size: 12px;
    color: #a78bfa;
  }
  .preview-btn {
    background: #1f2330;
    color: #d1d5db;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .preview-btn:hover {
    color: #fff;
    background: #2b3142;
  }
  .preview-container ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
    list-style: none;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .preview-container li {
    font-size: 11px;
    color: #d1d5db;
  }
  .preview-container img {
    display: block;
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 4px;
  }
  .install-box {
    position: sticky;
    bottom: 20px;
    background: #12141a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 18px 24px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5);
  }
  .install-title {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 10px;
  }
  .install-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .install-input {
    flex: 1 1 240px;
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #fff;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-family: monospace;
  }
  .action-btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background 120ms ease;
  }
  .copy-btn {
    background: #1f2330;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .copy-btn:hover { background: #2b3142; }
  .install-link-btn {
    background: #2563eb;
    color: #fff;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .install-link-btn:hover { background: #1d4ed8; }
  .status-text {
    font-size: 12px;
    color: #10b981;
    margin-top: 8px;
    min-height: 18px;
  }
  footer {
    margin-top: 48px;
    text-align: center;
    color: #6b7280;
    font-size: 12px;
  }
</style>
</head>
<body>
<main>
  <header>
    <div class="brand-line">
      <div class="brand-logo">D</div>
      <h1>ARVIO Discover</h1>
    </div>
    <p class="subtitle">
      A standalone catalog and metadata addon. Pick your favorite public and private rows, then install the manifest URL into ARVIO or any Stremio-compatible player.
    </p>

    <div class="info-banner">
      💡 <strong>Delegated Privacy:</strong> Watchlist and personal rows use client-side delegation. Your Trakt/SIMKL credentials and home server IP stay safely inside your app and are never transmitted to this server.
    </div>

    ${hasToken ? '' : '<div class="info-banner" style="color:#fcd34d; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.08);">⚠️ Server operator: set <code>TMDB_READ_TOKEN</code> in <code>.env.local</code> to enable full title previews and artwork.</div>'}

    <div class="presets-bar">
      <span class="presets-label">⚡ Quick Presets:</span>
      <button type="button" class="preset-btn" data-preset="trends">Public Trends</button>
      <button type="button" class="preset-btn" data-preset="streamer">The Streamer</button>
      <button type="button" class="preset-btn" data-preset="vod">IPTV & VOD</button>
      <button type="button" class="preset-btn" data-preset="selfhost">Self-Hoster & Trackers</button>
      <button type="button" class="preset-btn" data-preset="anime">Anime & Animation</button>
      <button type="button" class="preset-btn" data-preset="clear" style="margin-left:auto;">Clear All</button>
    </div>

    <div class="tabs">
      ${categories.map((c) => `<button type="button" class="tab-button ${c.id === 'all' ? 'active' : ''}" data-category="${c.id}">${c.name}</button>`).join('')}
    </div>
  </header>

  <div class="cards-list" id="cards-container">
    ${categoryCards}
  </div>

  <div class="install-box">
    <div class="install-title">Your Custom Manifest URL</div>
    <div class="install-row">
      <input id="url" type="url" data-network-origin="${networkOrigin}" readonly class="install-input">
      <button id="copy" type="button" class="action-btn copy-btn">Copy URL</button>
      <a id="stremio-link" href="#" class="action-btn install-link-btn">Install in Stremio / ARVIO</a>
    </div>
    <p id="status" class="status-text" role="status"></p>
  </div>

  <footer>
    This product uses the TMDB API but is not endorsed or certified by TMDB.
  </footer>
</main>

<script>
  const checkboxes = [...document.querySelectorAll('.catalog-checkbox')];
  const urlInput = document.querySelector('#url');
  const copyBtn = document.querySelector('#copy');
  const installLink = document.querySelector('#stremio-link');
  const statusEl = document.querySelector('#status');
  const tabButtons = [...document.querySelectorAll('.tab-button')];
  const cards = [...document.querySelectorAll('.catalog-card')];

  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  const installOrigin = localHosts.includes(location.hostname) && urlInput.dataset.networkOrigin
    ? urlInput.dataset.networkOrigin
    : location.origin;

  function updateManifestUrl() {
    const ids = checkboxes.filter((b) => b.checked).map((b) => b.value);
    if (!ids.length) {
      urlInput.value = '';
      copyBtn.disabled = true;
      installLink.style.display = 'none';
      statusEl.textContent = 'Select at least one catalog row.';
      return;
    }
    const manifestPath = '/c/' + ids.join(',') + '/manifest.json';
    const absoluteUrl = new URL(manifestPath, installOrigin).href;
    urlInput.value = absoluteUrl;
    copyBtn.disabled = false;

    // Stremio deep link protocol
    const cleanProtocol = absoluteUrl.replace(/^https?:\\/\\//, '');
    installLink.href = 'stremio://' + cleanProtocol;
    installLink.style.display = 'inline-flex';
    statusEl.textContent = ids.length + ' catalog rows selected.';
  }

  checkboxes.forEach((b) => b.addEventListener('change', updateManifestUrl));
  updateManifestUrl();

  // Copy button
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      statusEl.textContent = '✓ Manifest URL copied to clipboard.';
    } catch {
      urlInput.focus();
      urlInput.select();
      statusEl.textContent = 'URL selected. Press Ctrl+C / Cmd+C to copy.';
    }
  });

  // Presets handling
  const presets = {
    trends: ['trending-movies', 'trending-shows', 'popular-movies', 'popular-shows', 'top-rated-movies', 'top-rated-shows'],
    streamer: ['netflix-movies', 'netflix-shows', 'apple-tv-shows', 'disney-plus-movies', 'hbo-max-shows', 'prime-movies'],
    vod: ['trending-movies', 'vod-recent-movies', 'vod-recent-shows', 'hybrid-trending-vod-movies', 'hybrid-watchlist-vod-movies'],
    selfhost: ['homeserver-movies', 'homeserver-shows', 'trakt-watchlist-movies', 'trakt-watchlist-shows', 'hybrid-watchlist-server-movies'],
    anime: ['anime-trending-shows', 'ghibli-movies', 'simkl-plan-shows'],
    clear: [],
  };

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetIds = presets[btn.dataset.preset] || [];
      checkboxes.forEach((cb) => {
        cb.checked = targetIds.includes(cb.value);
      });
      updateManifestUrl();
    });
  });

  // Tab switching
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.category;

      cards.forEach((card) => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Live Title Previews
  document.querySelectorAll('.preview-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const panel = button.parentElement.nextElementSibling;
      button.disabled = true;
      panel.textContent = 'Loading titles from TMDB…';

      try {
        const response = await fetch(button.dataset.path);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load preview');

        const titles = (data.metas || []).slice(0, 6);
        if (!titles.length) {
          panel.textContent = 'No titles found in this catalog.';
          return;
        }

        const list = document.createElement('ul');
        for (const title of titles) {
          const item = document.createElement('li');
          if (title.poster) {
            const img = document.createElement('img');
            img.src = title.poster;
            img.alt = '';
            item.appendChild(img);
          }
          const span = document.createElement('span');
          span.textContent = title.name;
          item.appendChild(span);
          list.appendChild(item);
        }
        panel.replaceChildren(list);
      } catch (err) {
        panel.textContent = err.message || 'Unable to load preview.';
      } finally {
        button.disabled = false;
      }
    });
  });
</script>
</body>
</html>`;
}
