export function configurePage(catalogs, selected, hasToken, networkOrigin, initialProfileId = 'default', storedConfig = null) {
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

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

  const initialCards = catalogs
    .filter((cat) => cat.category !== 'homeserver')
    .map((cat) => {
      const isSelected = selected.some((row) => row.id === cat.id);
      const badge = cat.clientDelegate
        ? `<span class="badge delegate-badge">${escapeHtml(cat.clientDelegate.split(':')[0].toUpperCase())} DELEGATED</span>`
        : `<span class="badge public-badge">PUBLIC</span>`;
      const typeBadge = `<span class="badge type-badge">${escapeHtml(cat.type.toUpperCase())}</span>`;

      return `
        <div class="catalog-card" data-category="${escapeHtml(cat.category || 'public')}" data-id="${escapeHtml(cat.id)}">
          <div class="card-head">
            <label class="card-label">
              <input type="checkbox" value="${escapeHtml(cat.id)}" ${isSelected ? 'checked' : ''} class="catalog-checkbox">
              <span class="card-title">${escapeHtml(cat.name)}</span>
            </label>
            <div class="badges">
              ${badge}
              ${typeBadge}
            </div>
          </div>
          <p class="card-desc">${escapeHtml(cat.description || '')}</p>
          <div class="card-actions">
            ${cat.requiresDelegate
              ? `<div class="delegate-hint">🔒 Resolved locally on-device by ARVIO. Zero credentials shared.</div>`
              : `<button type="button" class="preview-btn" data-path="/catalog/${escapeHtml(cat.type)}/${escapeHtml(cat.id)}.json">Preview Titles</button>`}
          </div>
          <div class="preview-container" aria-live="polite"></div>
        </div>
      `;
    }).join('');

  const builtInJson = safeJson(catalogs);
  const initialSelectedJson = safeJson(selected.map((row) => row.id));
  const initialStoredJson = safeJson(storedConfig || null);

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
  .arvio-connect-card {
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(147, 51, 234, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 24px;
  }
  .connect-header {
    margin-bottom: 14px;
  }
  .connect-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }
  .connect-subtitle {
    font-size: 13px;
    color: #93c5fd;
    line-height: 1.4;
  }
  .login-form {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .form-input {
    flex: 1 1 200px;
    background: #090a0f;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
  }
  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .connect-btn {
    background: #2563eb;
    color: #fff;
    font-weight: 600;
  }
  .connect-btn:hover { background: #1d4ed8; }
  .error-text {
    font-size: 12px;
    color: #f87171;
    margin-top: 8px;
    min-height: 16px;
  }
  .connected-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e5e7eb;
  }
  .user-email {
    font-weight: 600;
  }
  .text-btn {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
    margin-left: 6px;
  }
  .text-btn:hover { color: #f87171; }
  .sync-btn {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }
  .sync-btn:hover { filter: brightness(1.1); }
  .profile-selection-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .profile-label {
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
  }
  .profile-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .profile-pill {
    background: #141724;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 120ms ease;
  }
  .profile-pill:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
  }
  .profile-pill.active {
    background: #3b82f6;
    border-color: #60a5fa;
    color: #fff;
    font-weight: 700;
  }
  .sync-status {
    font-size: 13px;
    font-weight: 600;
    margin-top: 10px;
    min-height: 18px;
  }
  .snapshot-panel {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(9, 10, 15, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .snapshot-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .snapshot-title {
    font-size: 13px;
    font-weight: 700;
    color: #f3f4f6;
  }
  .snapshot-time {
    font-size: 12px;
    color: #9ca3af;
    margin-left: 8px;
    font-weight: 400;
  }
  .refresh-btn {
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.28);
    padding: 6px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .refresh-btn:hover { background: #334155; color: #fff; }
  .refresh-btn:disabled { opacity: 0.6; cursor: default; }
  .snapshot-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }
  .snapshot-pill {
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .snapshot-pill.active {
    background: rgba(16, 185, 129, 0.14);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.35);
  }
  .snapshot-pill.inactive {
    background: rgba(107, 114, 128, 0.15);
    color: #9ca3af;
    border-color: rgba(107, 114, 128, 0.25);
  }
  .snapshot-note {
    font-size: 12px;
    line-height: 1.45;
    color: #9ca3af;
  }
  .snapshot-warning {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fcd34d;
  }
  .empty-snapshot-card {
    background: #14161f;
    border: 1px dashed rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    padding: 20px 22px;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.5;
  }
  .empty-snapshot-card strong { color: #fff; display: block; margin-bottom: 4px; }
  .install-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .save-btn {
    background: #059669;
    color: #fff;
    font-weight: 600;
    padding: 6px 14px;
    font-size: 12px;
  }
  .save-btn:hover { background: #047857; }
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

    <div class="arvio-connect-card">
      <div id="arvio-logged-out" class="connect-view">
        <div class="connect-header">
          <div class="connect-title">⚡ Connect to ARVIO (Direct Sync)</div>
          <p class="connect-subtitle">Sign in to sync your customized rows directly to your Android TV profiles. Zero reinstalling.</p>
        </div>
        <form id="arvio-login-form" class="login-form">
          <input id="arvio-email" type="email" placeholder="ARVIO Account Email" required class="form-input">
          <input id="arvio-password" type="password" placeholder="Password" required class="form-input">
          <button id="arvio-login-btn" type="submit" class="action-btn connect-btn">Connect ARVIO</button>
        </form>
        <div id="arvio-login-error" class="error-text"></div>
      </div>

      <div id="arvio-logged-in" class="connect-view" style="display:none;">
        <div class="connected-header">
          <div class="user-info">
            <span class="user-icon">👤</span>
            <span id="arvio-user-email" class="user-email"></span>
            <button id="arvio-logout-btn" type="button" class="text-btn">Sign Out</button>
          </div>
          <button id="sync-arvio-btn" type="button" class="action-btn sync-btn">
            ⚡ Save & Sync to Profile
          </button>
        </div>

        <div class="profile-selection-row">
          <span class="profile-label">Select Profile to Customize:</span>
          <div id="profile-tabs" class="profile-pills"></div>
        </div>
        <div id="snapshot-panel" class="snapshot-panel" style="display:none;">
          <div class="snapshot-head">
            <div>
              <span class="snapshot-title">Profile Integration Snapshot</span>
              <span id="snapshot-time" class="snapshot-time"></span>
            </div>
            <button id="refresh-snapshot-btn" type="button" class="refresh-btn">↻ Refresh Snapshot</button>
          </div>
          <div id="snapshot-pills" class="snapshot-pills"></div>
          <p class="snapshot-note">
            <strong>Snapshot mode:</strong> Rows below are built from this profile’s current ARVIO cloud snapshot. If you add or change Home Servers, libraries, IPTV, Trakt, or SIMKL later inside ARVIO, come back here, click <strong>Refresh Snapshot</strong>, and press <strong>Save &amp; Sync to Profile</strong>.
          </p>
          <div id="snapshot-stale-warning" class="snapshot-warning" style="display:none;"></div>
        </div>
        <div id="sync-status" class="sync-status"></div>
      </div>
    </div>

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
    ${initialCards}
  </div>

  <div class="install-box">
    <div class="install-title-row">
      <div class="install-title">Active Manifest for <span id="active-profile-label" style="color:#60a5fa; font-weight:700;">default</span></div>
      <button id="save-addon-btn" type="button" class="action-btn save-btn">Save to Addon</button>
    </div>
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
  const BUILTIN_CATALOGS = ${builtInJson};
  const INITIAL_STORED_CONFIG = ${initialStoredJson};
  let currentProfileId = ${safeJson(initialProfileId || 'default')};
  let selectedIdsSet = new Set(${initialSelectedJson});
  let storedCustomCatalogs = Array.isArray(INITIAL_STORED_CONFIG?.catalogs) ? INITIAL_STORED_CONFIG.catalogs : [];
  let activeCategory = 'all';

  let arvioSession = null;
  try {
    arvioSession = JSON.parse(localStorage.getItem('arvio.discover.session') || 'null');
  } catch {}

  const cardsContainer = document.querySelector('#cards-container');
  const urlInput = document.querySelector('#url');
  const copyBtn = document.querySelector('#copy');
  const installLink = document.querySelector('#stremio-link');
  const statusEl = document.querySelector('#status');
  const saveAddonBtn = document.querySelector('#save-addon-btn');
  const tabButtons = [...document.querySelectorAll('.tab-button')];
  const profileLabel = document.querySelector('#active-profile-label');

  // ARVIO elements
  const arvioLoggedOut = document.querySelector('#arvio-logged-out');
  const arvioLoggedIn = document.querySelector('#arvio-logged-in');
  const arvioEmailInput = document.querySelector('#arvio-email');
  const arvioPasswordInput = document.querySelector('#arvio-password');
  const arvioLoginForm = document.querySelector('#arvio-login-form');
  const arvioLoginBtn = document.querySelector('#arvio-login-btn');
  const arvioLoginError = document.querySelector('#arvio-login-error');
  const arvioUserEmail = document.querySelector('#arvio-user-email');
  const arvioLogoutBtn = document.querySelector('#arvio-logout-btn');
  const profileTabs = document.querySelector('#profile-tabs');
  const syncArvioBtn = document.querySelector('#sync-arvio-btn');
  const syncStatus = document.querySelector('#sync-status');
  const snapshotPanel = document.querySelector('#snapshot-panel');
  const snapshotTimeEl = document.querySelector('#snapshot-time');
  const snapshotPillsEl = document.querySelector('#snapshot-pills');
  const snapshotStaleWarning = document.querySelector('#snapshot-stale-warning');
  const refreshSnapshotBtn = document.querySelector('#refresh-snapshot-btn');

  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  const installOrigin = localHosts.includes(location.hostname) && urlInput.dataset.networkOrigin
    ? urlInput.dataset.networkOrigin
    : location.origin;

  function getActiveSnapshot() {
    if (!arvioSession || !arvioSession.token) return null;
    const snapshots = arvioSession.profileSnapshots || {};
    return snapshots[currentProfileId] || null;
  }

  function isCatalogActiveInSnapshot(cat, snapshot) {
    if (!snapshot) {
      return cat.category !== 'homeserver';
    }
    const hasHome = Array.isArray(snapshot.homeServerCatalogs) && snapshot.homeServerCatalogs.length > 0;
    if (cat.category === 'homeserver') {
      return snapshot.homeServerCatalogs.some((h) => h.id === cat.id);
    }
    if (cat.category === 'trakt') return Boolean(snapshot.trakt?.active);
    if (cat.category === 'simkl') return Boolean(snapshot.simkl?.active);
    if (cat.category === 'vod') return Boolean(snapshot.vod?.active);
    if (cat.id === 'hybrid-trending-vod-movies') return Boolean(snapshot.vod?.active);
    if (cat.id === 'hybrid-watchlist-vod-movies') return Boolean(snapshot.trakt?.active && snapshot.vod?.active);
    if (cat.id === 'hybrid-watchlist-server-movies') return Boolean(snapshot.trakt?.active && hasHome);
    return true;
  }

  function getVisibleCatalogs() {
    const snapshot = getActiveSnapshot();
    const baseBuiltIns = BUILTIN_CATALOGS.filter((cat) => cat.category !== 'homeserver');
    const dynamicHome = snapshot
      ? (snapshot.homeServerCatalogs || [])
      : storedCustomCatalogs;
    const combined = [...baseBuiltIns, ...dynamicHome];
    if (!snapshot) return combined;
    return combined.filter((cat) => isCatalogActiveInSnapshot(cat, snapshot));
  }

  function getSelectedPayloadCatalogs() {
    const visible = getVisibleCatalogs();
    const visibleById = new Map(visible.map((c) => [c.id, c]));
    const selectedIds = [...selectedIdsSet].filter((id) => visibleById.has(id));
    const snapshot = getActiveSnapshot();
    const customCatalogs = selectedIds
      .map((id) => visibleById.get(id))
      .filter((c) => c && !BUILTIN_CATALOGS.some((b) => b.id === c.id));
    const snapshotMeta = snapshot
      ? {
          snapshotAt: snapshot.snapshotAt,
          trakt: snapshot.trakt,
          simkl: snapshot.simkl,
          vod: snapshot.vod,
          homeServers: snapshot.homeServers,
        }
      : null;
    return { selectedIds, customCatalogs, snapshotMeta };
  }

  function renderSnapshotPanel() {
    const snapshot = getActiveSnapshot();
    if (!arvioSession || !arvioSession.token) {
      snapshotPanel.style.display = 'none';
      return;
    }
    snapshotPanel.style.display = 'block';
    if (!snapshot) {
      snapshotTimeEl.textContent = 'No snapshot loaded yet — click Refresh Snapshot.';
      snapshotPillsEl.replaceChildren();
      snapshotStaleWarning.style.display = 'none';
      return;
    }

    snapshotTimeEl.textContent = 'Captured ' + new Date(snapshot.snapshotAt || Date.now()).toLocaleString();
    snapshotPillsEl.replaceChildren();

    const makePill = (label, isActive) => {
      const span = document.createElement('span');
      span.className = 'snapshot-pill ' + (isActive ? 'active' : 'inactive');
      span.textContent = label;
      return span;
    };

    snapshotPillsEl.appendChild(makePill(snapshot.trakt?.active ? '✓ Trakt connected' : '○ Trakt not connected', Boolean(snapshot.trakt?.active)));
    snapshotPillsEl.appendChild(makePill(snapshot.simkl?.active ? '✓ SIMKL connected' : '○ SIMKL not connected', Boolean(snapshot.simkl?.active)));
    snapshotPillsEl.appendChild(makePill(
      snapshot.vod?.active ? ('✓ IPTV / VOD (' + (snapshot.vod.playlistCount || 1) + ')') : '○ IPTV / VOD not configured',
      Boolean(snapshot.vod?.active)
    ));

    const hsCount = snapshot.homeServerCatalogs?.length || 0;
    const hsNames = (snapshot.homeServers || []).map((s) => s.serverName).filter(Boolean).join(', ');
    snapshotPillsEl.appendChild(makePill(
      hsCount > 0 ? ('✓ Home Server: ' + hsNames + ' (' + hsCount + ' libraries)') : '○ No Home Servers in snapshot',
      hsCount > 0
    ));

    const visibleIds = new Set(getVisibleCatalogs().map((c) => c.id));
    const droppedCount = [...selectedIdsSet].filter((id) => !visibleIds.has(id)).length;
    if (droppedCount > 0) {
      snapshotStaleWarning.style.display = 'block';
      snapshotStaleWarning.textContent = droppedCount + ' previously saved row(s) are no longer active in this profile snapshot and will be removed when you Save & Sync.';
    } else {
      snapshotStaleWarning.style.display = 'none';
    }
  }

  function buildCatalogCardEl(cat, isChecked) {
    const card = document.createElement('div');
    card.className = 'catalog-card';
    card.dataset.category = cat.category || 'public';
    card.dataset.id = cat.id;

    const head = document.createElement('div');
    head.className = 'card-head';

    const label = document.createElement('label');
    label.className = 'card-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'catalog-checkbox';
    cb.value = cat.id;
    cb.checked = isChecked;
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIdsSet.add(cat.id);
      else selectedIdsSet.delete(cat.id);
      updateManifestUrl();
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'card-title';
    titleSpan.textContent = cat.name;
    label.appendChild(cb);
    label.appendChild(titleSpan);

    const badges = document.createElement('div');
    badges.className = 'badges';
    const sourceBadge = document.createElement('span');
    sourceBadge.className = 'badge ' + (cat.clientDelegate ? 'delegate-badge' : 'public-badge');
    sourceBadge.textContent = cat.clientDelegate
      ? (cat.serverName ? (cat.serverName.toUpperCase() + ' · DELEGATED') : (cat.clientDelegate.split(':')[0].toUpperCase() + ' DELEGATED'))
      : 'PUBLIC';
    const typeBadge = document.createElement('span');
    typeBadge.className = 'badge type-badge';
    typeBadge.textContent = String(cat.type || 'movie').toUpperCase();
    badges.appendChild(sourceBadge);
    badges.appendChild(typeBadge);

    head.appendChild(label);
    head.appendChild(badges);

    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = cat.description || '';

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    previewContainer.setAttribute('aria-live', 'polite');

    if (cat.requiresDelegate) {
      const hint = document.createElement('div');
      hint.className = 'delegate-hint';
      hint.textContent = '🔒 Resolved locally on-device by ARVIO. Zero credentials shared.';
      actions.appendChild(hint);
    } else {
      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'preview-btn';
      previewBtn.textContent = 'Preview Titles';
      previewBtn.addEventListener('click', () => loadCardPreview(previewBtn, previewContainer, '/catalog/' + encodeURIComponent(cat.type) + '/' + encodeURIComponent(cat.id) + '.json'));
      actions.appendChild(previewBtn);
    }

    card.appendChild(head);
    card.appendChild(desc);
    card.appendChild(actions);
    card.appendChild(previewContainer);
    return card;
  }

  function renderCards() {
    const snapshot = getActiveSnapshot();
    const visible = getVisibleCatalogs();
    const filtered = activeCategory === 'all'
      ? visible
      : visible.filter((c) => (c.category || 'public') === activeCategory);

    cardsContainer.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-snapshot-card';
      const strong = document.createElement('strong');
      const body = document.createElement('span');
      if (snapshot) {
        strong.textContent = 'Not active in this profile’s current snapshot';
        body.textContent = 'This profile has no configured entries for this section yet. If you added a Home Server, library, IPTV playlist, Trakt, or SIMKL inside ARVIO after saving this addon, click “↻ Refresh Snapshot” above and press “Save & Sync to Profile”.';
      } else if (activeCategory === 'homeserver') {
        strong.textContent = 'Sign in to ARVIO to snapshot your Home Servers';
        body.textContent = 'Log in above to read your profile’s Plex, Jellyfin, or Emby libraries by name so each Home Server row points to an exact library.';
      } else {
        strong.textContent = 'No catalogs in this category.';
        body.textContent = 'Choose another category tab above.';
      }
      empty.appendChild(strong);
      empty.appendChild(body);
      cardsContainer.appendChild(empty);
      return;
    }

    for (const cat of filtered) {
      cardsContainer.appendChild(buildCatalogCardEl(cat, selectedIdsSet.has(cat.id)));
    }
  }

  function updateManifestUrl() {
    const { selectedIds } = getSelectedPayloadCatalogs();
    if (!selectedIds.length) {
      urlInput.value = '';
      copyBtn.disabled = true;
      installLink.style.display = 'none';
      statusEl.textContent = 'Select at least one catalog row.';
      return;
    }
    const manifestPath = '/p/' + encodeURIComponent(currentProfileId) + '/manifest.json';
    const absoluteUrl = new URL(manifestPath, installOrigin).href;
    urlInput.value = absoluteUrl;
    copyBtn.disabled = false;

    const cleanProtocol = absoluteUrl.replace(/^https?:\\/\\//, '');
    installLink.href = 'stremio://' + cleanProtocol;
    installLink.style.display = 'inline-flex';
    statusEl.textContent = selectedIds.length + ' catalog rows active for ' + currentProfileId + '.';
    if (profileLabel) profileLabel.textContent = currentProfileId;
  }

  async function loadProfileConfig(profileId) {
    statusEl.textContent = 'Loading configuration for ' + profileId + '…';
    try {
      const res = await fetch('/api/config/' + encodeURIComponent(profileId));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.selectedIds)) {
          selectedIdsSet = new Set(data.selectedIds);
        }
        storedCustomCatalogs = Array.isArray(data.catalogs) ? data.catalogs : [];
      }
    } catch (e) {
      console.warn('Could not load profile config:', e);
    }
    renderSnapshotPanel();
    renderCards();
    updateManifestUrl();
  }

  async function saveProfileConfig(profileId) {
    const { selectedIds, customCatalogs, snapshotMeta } = getSelectedPayloadCatalogs();
    statusEl.textContent = 'Saving configuration for ' + profileId + '…';
    try {
      const res = await fetch('/api/config/' + encodeURIComponent(profileId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIds, customCatalogs, snapshotMeta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      statusEl.textContent = '✓ Saved setup for ' + profileId + ' (' + data.count + ' rows). Addon will serve these automatically.';
      statusEl.style.color = '#10b981';
    } catch (err) {
      statusEl.textContent = 'Error saving setup: ' + err.message;
      statusEl.style.color = '#f87171';
    }
  }

  function renderProfiles() {
    if (!arvioSession || !arvioSession.profiles) return;
    profileTabs.innerHTML = '';
    const profiles = arvioSession.profiles;
    profiles.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-pill' + (p.id === currentProfileId ? ' active' : '');
      btn.textContent = (p.id === arvioSession.activeProfileId ? '★ ' : '') + (p.name || p.id);
      btn.addEventListener('click', () => {
        currentProfileId = p.id;
        document.querySelectorAll('.profile-pill').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
        loadProfileConfig(currentProfileId);
      });
      profileTabs.appendChild(btn);
    });
  }

  function syncSessionUi() {
    if (arvioSession && arvioSession.token) {
      arvioLoggedOut.style.display = 'none';
      arvioLoggedIn.style.display = 'block';
      arvioUserEmail.textContent = arvioSession.user?.email || 'Connected';
      if (!currentProfileId || currentProfileId === 'default') {
        currentProfileId = arvioSession.activeProfileId || arvioSession.profiles?.[0]?.id || 'default';
      }
      renderProfiles();
    } else {
      arvioLoggedOut.style.display = 'block';
      arvioLoggedIn.style.display = 'none';
      currentProfileId = 'default';
    }
    renderSnapshotPanel();
    renderCards();
    updateManifestUrl();
  }

  // Login form handler
  arvioLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    arvioLoginError.textContent = '';
    arvioLoginBtn.disabled = true;
    arvioLoginBtn.textContent = 'Connecting…';

    try {
      const email = arvioEmailInput.value.trim();
      const password = arvioPasswordInput.value;
      const res = await fetch('/api/arvio/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      arvioSession = data;
      localStorage.setItem('arvio.discover.session', JSON.stringify(data));
      syncSessionUi();
      await loadProfileConfig(currentProfileId);
    } catch (err) {
      arvioLoginError.textContent = err.message || 'Unable to connect to ARVIO.';
    } finally {
      arvioLoginBtn.disabled = false;
      arvioLoginBtn.textContent = 'Connect ARVIO';
    }
  });

  // Refresh cloud snapshot handler
  refreshSnapshotBtn.addEventListener('click', async () => {
    if (!arvioSession || !arvioSession.token) return;
    refreshSnapshotBtn.disabled = true;
    refreshSnapshotBtn.textContent = 'Refreshing…';
    syncStatus.textContent = 'Pulling latest integrations & libraries from ARVIO Cloud…';
    syncStatus.style.color = '#93c5fd';
    try {
      const res = await fetch('/api/arvio/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: arvioSession.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not refresh snapshot');
      arvioSession = {
        ...arvioSession,
        profiles: data.profiles || arvioSession.profiles,
        activeProfileId: data.activeProfileId || arvioSession.activeProfileId,
        profileSnapshots: data.profileSnapshots || arvioSession.profileSnapshots,
      };
      localStorage.setItem('arvio.discover.session', JSON.stringify(arvioSession));
      renderProfiles();
      renderSnapshotPanel();
      renderCards();
      updateManifestUrl();
      syncStatus.textContent = '✓ Snapshot updated from ARVIO Cloud. Review rows below and click Save & Sync to update your addon.';
      syncStatus.style.color = '#10b981';
    } catch (err) {
      syncStatus.textContent = 'Snapshot error: ' + err.message;
      syncStatus.style.color = '#f87171';
    } finally {
      refreshSnapshotBtn.disabled = false;
      refreshSnapshotBtn.textContent = '↻ Refresh Snapshot';
    }
  });

  // Logout handler
  arvioLogoutBtn.addEventListener('click', () => {
    arvioSession = null;
    localStorage.removeItem('arvio.discover.session');
    syncSessionUi();
  });

  // Direct ARVIO Cloud Sync handler
  syncArvioBtn.addEventListener('click', async () => {
    if (!arvioSession || !arvioSession.token) {
      syncStatus.textContent = 'Please log in to ARVIO first.';
      syncStatus.style.color = '#f87171';
      return;
    }
    const { selectedIds, customCatalogs, snapshotMeta } = getSelectedPayloadCatalogs();
    if (!selectedIds.length) {
      syncStatus.textContent = 'Select at least one active row before syncing.';
      syncStatus.style.color = '#f87171';
      return;
    }
    syncArvioBtn.disabled = true;
    syncArvioBtn.textContent = 'Syncing to Profile…';
    syncStatus.textContent = 'Updating manifest and syncing snapshot to ARVIO cloud…';
    syncStatus.style.color = '#93c5fd';

    try {
      const res = await fetch('/api/arvio/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: arvioSession.token,
          profileId: currentProfileId,
          manifestUrl: urlInput.value,
          selectedIds,
          customCatalogs,
          snapshotMeta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      syncStatus.textContent = '✓ Saved snapshot and synced ' + selectedIds.length + ' row(s) to profile ' + currentProfileId + '!';
      syncStatus.style.color = '#10b981';
      statusEl.textContent = '✓ Synced to ARVIO Cloud at ' + new Date().toLocaleTimeString();
      statusEl.style.color = '#10b981';
    } catch (err) {
      syncStatus.textContent = 'Sync error: ' + err.message;
      syncStatus.style.color = '#f87171';
    } finally {
      syncArvioBtn.disabled = false;
      syncArvioBtn.textContent = '⚡ Save & Sync to Profile';
    }
  });

  // Save to Addon button
  saveAddonBtn.addEventListener('click', () => saveProfileConfig(currentProfileId));

  syncSessionUi();

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

  // Presets handling (snapshot-aware)
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const visible = getVisibleCatalogs();
      const visibleIds = new Set(visible.map((c) => c.id));
      let targets = [];
      if (preset === 'trends') {
        targets = ['trending-movies', 'trending-shows', 'popular-movies', 'popular-shows', 'top-rated-movies', 'top-rated-shows'];
      } else if (preset === 'streamer') {
        targets = ['netflix-movies', 'netflix-shows', 'apple-tv-shows', 'disney-plus-movies', 'hbo-max-shows', 'prime-movies'];
      } else if (preset === 'vod') {
        targets = ['trending-movies', 'vod-recent-movies', 'vod-recent-shows', 'hybrid-trending-vod-movies', 'hybrid-watchlist-vod-movies'];
      } else if (preset === 'selfhost') {
        const homeIds = visible.filter((c) => c.category === 'homeserver').map((c) => c.id);
        targets = [...homeIds, 'trakt-watchlist-movies', 'trakt-watchlist-shows', 'simkl-plan-movies', 'simkl-plan-shows', 'hybrid-watchlist-server-movies'];
      } else if (preset === 'anime') {
        targets = ['anime-trending-shows', 'ghibli-movies', 'simkl-plan-shows'];
      } else if (preset === 'clear') {
        targets = [];
      }
      selectedIdsSet = new Set(targets.filter((id) => visibleIds.has(id)));
      renderCards();
      renderSnapshotPanel();
      updateManifestUrl();
    });
  });

  // Tab switching
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderCards();
    });
  });

  async function loadCardPreview(button, panel, path) {
    button.disabled = true;
    panel.textContent = 'Loading titles from TMDB…';

    try {
      const response = await fetch(path);
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
  }
</script>
</body>
</html>`;
}
