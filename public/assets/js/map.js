import { getJSON, postJSON, escapeHTML } from './api.js';
import { initTheme, cycleTheme, isDark } from './theme.js';
import { detectLocation, cacheLocation, setHashLocation } from './geolocation.js';
import { checkAuth, getCurrentUser, isLoggedIn, isRole } from './auth.js';
import { announce, populateSelect } from './utils.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */
let map, clusterGroup, lightTiles, darkTiles;
let debounceTimer = null;

const SEVERITY_COLORS = {
  1: '#16a34a', // minor — green
  2: '#d97706', // major — orange
  3: '#dc2626'  // critical — red
};
const SEVERITY_LABELS = { 1: 'Minor', 2: 'Major', 3: 'Critical' };

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */
const filterPanel   = document.getElementById('filterPanel');
const filterForm    = document.getElementById('filterForm');
const filterToggle  = document.getElementById('filterToggleBtn');
const filterClose   = document.getElementById('filterCloseBtn');
const detailPanel   = document.getElementById('detailPanel');
const detailContent = document.getElementById('detailContent');
const detailClose   = document.getElementById('detailCloseBtn');
const navAuth       = document.getElementById('nav-auth');
const navModerate   = document.getElementById('nav-moderate');
const themeToggle   = document.getElementById('themeToggle');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
}

function severityColor(level) {
  return SEVERITY_COLORS[level] || '#6c757d';
}

/* ------------------------------------------------------------------ */
/*  Tile layers                                                        */
/* ------------------------------------------------------------------ */
function createTileLayers() {
  lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });
  darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  });
}

function applyTileLayer() {
  const wantDark = isDark();
  const active   = wantDark ? darkTiles : lightTiles;
  const inactive = wantDark ? lightTiles : darkTiles;
  if (map.hasLayer(inactive)) map.removeLayer(inactive);
  if (!map.hasLayer(active))  active.addTo(map);
}

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */
function getFilterParams() {
  const fd = new FormData(filterForm);
  const params = new URLSearchParams();
  for (const [k, v] of fd.entries()) {
    if (v) params.set(k, v);
  }
  return params;
}

async function populateFilters() {
  try {
    const lookups = await getJSON('/api/lookups.php');
    populateSelect('filterMode', lookups.reporter_modes || [], 'id', 'name');
    populateSelect('filterType', lookups.incident_types || [], 'id', 'name');
    populateSelect('filterSeverity', lookups.severity_levels || [], 'id', 'name');
    populateSelect('filterParty', lookups.other_parties || [], 'id', 'name');
  } catch {
    /* lookups unavailable — filters stay with "All" */
  }
}

/* ------------------------------------------------------------------ */
/*  Load markers                                                       */
/* ------------------------------------------------------------------ */
async function loadMarkers() {
  const bounds = map.getBounds();
  const bbox = [
    bounds.getSouth(), bounds.getWest(),
    bounds.getNorth(), bounds.getEast()
  ].join(',');

  const filterParams = getFilterParams();
  filterParams.set('bbox', bbox);

  announce('Loading reports...');
  try {
    const data = await getJSON(`/api/reports/list.php?${filterParams.toString()}`);
    clusterGroup.clearLayers();

    const reports = data.reports || data || [];
    reports.forEach(r => {
      const color = severityColor(r.severity_id || r.severity);
      const marker = L.circleMarker([r.latitude, r.longitude], {
        radius: 8,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.7
      });

      const desc = escapeHTML((r.description || '').slice(0, 100));
      const sevLabel = SEVERITY_LABELS[r.severity_id || r.severity] || escapeHTML(r.severity);
      marker.bindPopup(`
        <div>
          <span class="badge badge-primary">${escapeHTML(r.incident_type || r.incident_type_name || '')}</span>
          <span class="badge" style="background:${color};color:#fff">${sevLabel}</span>
          <p style="margin:8px 0">${desc}${(r.description || '').length > 100 ? '&hellip;' : ''}</p>
          <button class="btn btn-sm" data-report-id="${escapeHTML(r.id)}">View Details</button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.querySelector(`[data-report-id="${r.id}"]`);
        if (btn) btn.addEventListener('click', () => openDetail(r.id));
      });

      clusterGroup.addLayer(marker);
    });

    announce(`${reports.length} report${reports.length !== 1 ? 's' : ''} found`);
  } catch (err) {
    console.error('Failed to load reports', err);
    announce('Failed to load reports');
  }
}

const debouncedLoad = debounce(loadMarkers, 300);

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */
async function openDetail(id) {
  try {
    const report = await getJSON(`/api/reports/detail.php?id=${encodeURIComponent(id)}`);
    renderDetail(report);
    detailPanel.hidden = false;
    detailPanel.classList.add('open');
  } catch (err) {
    console.error('Failed to load report detail', err);
  }
}

function renderDetail(r) {
  const sevColor = severityColor(r.severity_id || r.severity);
  const sevLabel = SEVERITY_LABELS[r.severity_id || r.severity] || escapeHTML(r.severity);

  let photosHTML = '';
  if (r.photos && r.photos.length) {
    photosHTML = `<div class="detail-photos">${r.photos.map(p =>
      `<img src="${escapeHTML(p.url)}" alt="${escapeHTML(p.alt || 'Report photo')}">`
    ).join('')}</div>`;
  }

  let commentsHTML = '<div class="comment-list">';
  if (r.comments && r.comments.length) {
    r.comments.forEach(c => {
      commentsHTML += `
        <div class="comment-item">
          <div class="comment-meta">${escapeHTML(c.author || 'Anonymous')} &mdash; ${escapeHTML(c.created_at || '')}</div>
          <p>${escapeHTML(c.body || c.comment || '')}</p>
        </div>`;
    });
  } else {
    commentsHTML += '<p class="text-secondary text-sm">No comments yet.</p>';
  }
  commentsHTML += '</div>';

  const commentForm = buildCommentForm(r.id);

  detailContent.innerHTML = `
    <span class="badge badge-primary">${escapeHTML(r.incident_type || r.incident_type_name || '')}</span>
    <span class="badge" style="background:${sevColor};color:#fff">${sevLabel}</span>
    <p style="margin-top:var(--space-md)">${escapeHTML(r.description || '')}</p>
    <p class="text-sm text-secondary">Reported: ${escapeHTML(r.created_at || r.timestamp || '')}</p>
    ${photosHTML}
    <h3>Comments</h3>
    ${commentsHTML}
    ${commentForm}
  `;

  const form = detailContent.querySelector('#commentForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitComment(r.id, form);
    });
  }
}

function buildCommentForm(reportId) {
  const nameField = isLoggedIn() ? '' : `
    <div class="form-field">
      <label for="commentName">Your Name</label>
      <input type="text" id="commentName" name="name" required aria-required="true">
    </div>
    <div class="form-field" style="display:none" aria-hidden="true">
      <label for="commentWebsite">Website</label>
      <input type="text" id="commentWebsite" name="website" tabindex="-1" autocomplete="off">
    </div>`;

  return `
    <form id="commentForm" data-report-id="${escapeHTML(reportId)}">
      <h4>Add a Comment</h4>
      ${nameField}
      <div class="form-field">
        <label for="commentBody">Comment</label>
        <textarea id="commentBody" name="body" required aria-required="true" maxlength="1000"></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-sm">Post Comment</button>
      </div>
    </form>`;
}

async function submitComment(reportId, form) {
  const fd = new FormData(form);
  const payload = { report_id: reportId };
  for (const [k, v] of fd.entries()) payload[k] = v;

  if (payload.website) return; // honeypot triggered

  try {
    await postJSON('/api/reports/comment.php', payload);
    openDetail(reportId); // refresh
  } catch (err) {
    console.error('Comment failed', err);
  }
}

function closeDetail() {
  detailPanel.classList.remove('open');
  setTimeout(() => { detailPanel.hidden = true; }, 200);
}

/* ------------------------------------------------------------------ */
/*  Nav updates                                                        */
/* ------------------------------------------------------------------ */
function updateNav() {
  if (isLoggedIn()) {
    const user = getCurrentUser();
    navAuth.innerHTML = `<a href="user_profile.html">${escapeHTML(user.username || 'Profile')}</a>`;
  } else {
    navAuth.innerHTML = '<a href="login.html">Log In</a>';
  }
  if (isRole('moderator')) {
    navModerate.hidden = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */
async function init() {
  initTheme();
  await checkAuth();
  updateNav();

  createTileLayers();
  const loc = await detectLocation();
  map = L.map('map', { zoomControl: true }).setView([loc.lat, loc.lng], loc.zoom || 13);
  applyTileLayer();

  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);

  // Events
  map.on('moveend', () => {
    const c = map.getCenter();
    setHashLocation(c.lat, c.lng, map.getZoom());
    cacheLocation(c.lat, c.lng, map.getZoom());
    debouncedLoad();
  });

  window.addEventListener('themechange', () => applyTileLayer());

  themeToggle.addEventListener('click', () => cycleTheme());

  // Filter panel
  filterToggle.addEventListener('click', () => {
    filterPanel.classList.toggle('open');
  });
  filterClose.addEventListener('click', () => {
    filterPanel.classList.remove('open');
  });
  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadMarkers();
    filterPanel.classList.remove('open');
  });
  filterForm.addEventListener('reset', () => {
    setTimeout(() => loadMarkers(), 0);
  });

  // Detail panel
  detailClose.addEventListener('click', closeDetail);

  // Populate filters + initial load
  await populateFilters();
  loadMarkers();
}

init();
