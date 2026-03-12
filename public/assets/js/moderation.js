import { getJSON, postJSON, putJSON, escapeHTML } from './api.js';
import { checkAuth, isLoggedIn, isRole, getCurrentUser } from './auth.js';
import { initTheme, cycleTheme } from './theme.js';
import { announce, statusBadge } from './utils.js';

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */
const navAuth        = document.getElementById('nav-auth');
const navAdmin       = document.getElementById('nav-admin');
const themeToggle    = document.getElementById('themeToggle');
const adminSection   = document.getElementById('adminSection');
const adminFeedback  = document.getElementById('adminFeedback');

// Tab elements
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Lazy-load flags
const loaded = { pending: false, flagged: false, log: false, analytics: false };

let trendChartInstance = null;
let logPage = 1;
const logPerPage = 50;

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */
function switchTab(targetId) {
  tabBtns.forEach(btn => {
    const selected = btn.getAttribute('aria-controls') === targetId;
    btn.setAttribute('aria-selected', String(selected));
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === targetId);
  });

  // Lazy load
  if (targetId === 'tabPending' && !loaded.pending) loadPending();
  if (targetId === 'tabFlagged' && !loaded.flagged) loadFlagged();
  if (targetId === 'tabLog' && !loaded.log) loadLog();
  if (targetId === 'tabAnalytics' && !loaded.analytics) loadAnalytics();
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Pending Reports                                             */
/* ------------------------------------------------------------------ */
async function loadPending() {
  loaded.pending = true;
  const list = document.getElementById('pendingList');
  const empty = document.getElementById('pendingEmpty');

  try {
    const data = await getJSON('/api/reports/list?status=pending&per_page=100');
    const reports = data.reports || data || [];

    list.innerHTML = '';
    if (reports.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    reports.forEach(r => {
      const card = document.createElement('div');
      card.className = 'mod-card';
      card.innerHTML = `
        <div>
          <strong>${escapeHTML(r.incident_type || r.incident_type_name || '')}</strong>
          ${statusBadge(r.status || 'pending')}
          <span class="text-sm text-secondary">#${escapeHTML(r.id)}</span>
        </div>
        <p>${escapeHTML(r.description || '')}</p>
        <p class="text-sm text-secondary">
          By: ${escapeHTML(r.username || 'Anonymous')} &middot; ${escapeHTML(r.created_at || r.timestamp || '')}
        </p>
        <div class="mod-card-actions">
          <textarea placeholder="Moderation notes..." aria-label="Notes for report ${escapeHTML(r.id)}" class="mod-notes"></textarea>
          <button type="button" class="btn btn-sm btn-success mod-approve" data-id="${escapeHTML(r.id)}">Approve</button>
          <button type="button" class="btn btn-sm btn-danger mod-reject" data-id="${escapeHTML(r.id)}">Reject</button>
        </div>
      `;

      card.querySelector('.mod-approve').addEventListener('click', () =>
        moderateReport(r.id, 'approve', card.querySelector('.mod-notes').value));
      card.querySelector('.mod-reject').addEventListener('click', () =>
        moderateReport(r.id, 'reject', card.querySelector('.mod-notes').value));

      list.appendChild(card);
    });
    announce(`${reports.length} pending report(s)`);
  } catch (err) {
    console.error('Failed to load pending', err);
    list.innerHTML = '<p class="alert alert-error">Failed to load pending reports.</p>';
  }
}

async function moderateReport(id, action, notes) {
  try {
    await postJSON('/api/reports/moderate', { report_id: id, action, notes });
    announce(`Report ${id} ${action}d`);
    loaded.pending = false;
    loadPending();
  } catch (err) {
    console.error('Moderation failed', err);
    announce('Moderation action failed');
  }
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Flagged Content                                             */
/* ------------------------------------------------------------------ */
async function loadFlagged() {
  loaded.flagged = true;
  const list = document.getElementById('flaggedList');
  const empty = document.getElementById('flaggedEmpty');

  try {
    const data = await getJSON('/api/flags/list');
    const flags = data.flags || data || [];

    list.innerHTML = '';
    if (flags.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    flags.forEach(f => {
      const card = document.createElement('div');
      card.className = 'mod-card';
      card.innerHTML = `
        <div>
          <strong>Flagged ${escapeHTML(f.target_type || 'item')} #${escapeHTML(f.target_id)}</strong>
        </div>
        <p>Reason: ${escapeHTML(f.reason || '')}</p>
        <p class="text-sm text-secondary">${escapeHTML(f.created_at || f.timestamp || '')}</p>
        <div class="mod-card-actions">
          <textarea placeholder="Resolution notes..." aria-label="Notes for flag ${escapeHTML(f.id)}" class="flag-notes"></textarea>
          <button type="button" class="btn btn-sm btn-secondary flag-dismiss" data-id="${escapeHTML(f.id)}">Dismiss</button>
          <button type="button" class="btn btn-sm btn-danger flag-remove" data-id="${escapeHTML(f.id)}">Remove Content</button>
        </div>
      `;

      card.querySelector('.flag-dismiss').addEventListener('click', () =>
        resolveFlag(f.id, 'dismiss', card.querySelector('.flag-notes').value));
      card.querySelector('.flag-remove').addEventListener('click', () =>
        resolveFlag(f.id, 'remove', card.querySelector('.flag-notes').value));

      list.appendChild(card);
    });
    announce(`${flags.length} flagged item(s)`);
  } catch (err) {
    console.error('Failed to load flags', err);
    list.innerHTML = '<p class="alert alert-error">Failed to load flagged content.</p>';
  }
}

async function resolveFlag(id, action, notes) {
  try {
    await postJSON('/api/flags/resolve', { flag_id: id, action, notes });
    announce(`Flag ${id} ${action}ed`);
    loaded.flagged = false;
    loadFlagged();
  } catch (err) {
    console.error('Flag resolution failed', err);
    announce('Flag resolution failed');
  }
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Moderation Log                                              */
/* ------------------------------------------------------------------ */
async function loadLog() {
  loaded.log = true;
  const tbody = document.getElementById('logTableBody');

  const params = new URLSearchParams();
  const action = document.getElementById('logAction').value;
  const search = document.getElementById('logSearch').value;
  const startD = document.getElementById('logStart').value;
  const endD   = document.getElementById('logEnd').value;

  if (action) params.set('action', action);
  if (search) params.set('search', search);
  if (startD) params.set('start_date', startD);
  if (endD)   params.set('end_date', endD);
  params.set('page', logPage);
  params.set('per_page', logPerPage);

  try {
    const data = await getJSON(`/api/moderation/log?${params.toString()}`);
    const logs = data.logs || data || [];
    const total = data.total || logs.length;

    tbody.innerHTML = '';
    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHTML(l.id)}</td>
        <td>${escapeHTML(l.moderator || l.moderator_name || '')}</td>
        <td>${escapeHTML(l.action_type || l.action || '')}</td>
        <td>${escapeHTML(l.target_id || '')}</td>
        <td>${escapeHTML(l.details || '')}</td>
        <td>${escapeHTML(l.notes || '')}</td>
        <td>${escapeHTML(l.created_at || l.timestamp || '')}</td>
      `;
      tbody.appendChild(tr);
    });

    renderLogPagination(total);
    announce(`${logs.length} log entries loaded`);
  } catch (err) {
    console.error('Failed to load log', err);
    tbody.innerHTML = '<tr><td colspan="7">Failed to load moderation log.</td></tr>';
  }
}

function renderLogPagination(total) {
  const pag = document.getElementById('logPagination');
  const totalPages = Math.max(1, Math.ceil(total / logPerPage));
  pag.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'btn btn-sm btn-secondary';
  prev.textContent = 'Previous';
  prev.disabled = logPage <= 1;
  prev.addEventListener('click', () => { logPage--; loadLog(); });

  const info = document.createElement('span');
  info.textContent = `Page ${logPage} of ${totalPages}`;

  const next = document.createElement('button');
  next.className = 'btn btn-sm btn-secondary';
  next.textContent = 'Next';
  next.disabled = logPage >= totalPages;
  next.addEventListener('click', () => { logPage++; loadLog(); });

  pag.append(prev, info, next);
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Analytics                                                   */
/* ------------------------------------------------------------------ */
async function loadAnalytics() {
  loaded.analytics = true;
  const grid = document.getElementById('statsGrid');

  try {
    const data = await getJSON('/api/moderation/stats');

    grid.innerHTML = [
      { label: 'Total Reports', value: data.total || 0 },
      { label: 'Approved', value: data.approved || 0 },
      { label: 'Rejected', value: data.rejected || 0 },
      { label: 'Pending', value: data.pending || 0 },
      { label: 'Avg Resolution (hrs)', value: data.avg_resolution_hours || '—' }
    ].map(s => `
      <div class="stat-card">
        <div class="stat-number">${escapeHTML(String(s.value))}</div>
        <div class="stat-label">${escapeHTML(s.label)}</div>
      </div>
    `).join('');

    // Trend chart
    const trend = data.trend || [];
    const labels = [...new Set(trend.map(t => t.week))].sort();
    const approved = labels.map(w => (trend.find(t => t.week === w && t.status === 'approved') || {}).count || 0);
    const rejected = labels.map(w => (trend.find(t => t.week === w && t.status === 'rejected') || {}).count || 0);

    const ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Approved',
            data: approved,
            borderColor: 'rgb(22, 163, 74)',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Rejected',
            data: rejected,
            borderColor: 'rgb(220, 38, 38)',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });

    announce('Analytics loaded');
  } catch (err) {
    console.error('Failed to load analytics', err);
    grid.innerHTML = '<p class="alert alert-error">Failed to load analytics.</p>';
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Settings                                                     */
/* ------------------------------------------------------------------ */
async function loadAdminSettings() {
  const editor = document.getElementById('settingsEditor');
  try {
    const data = await getJSON('/api/admin/settings');
    const settings = data.settings || data || {};
    editor.innerHTML = '';

    Object.entries(settings).forEach(([key, val]) => {
      const row = document.createElement('div');
      row.className = 'settings-row';
      row.innerHTML = `
        <label for="setting-${escapeHTML(key)}">${escapeHTML(key)}</label>
        <input type="text" id="setting-${escapeHTML(key)}" name="${escapeHTML(key)}" value="${escapeHTML(String(val))}">
      `;
      editor.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load settings', err);
    editor.innerHTML = '<p class="alert alert-error">Failed to load settings.</p>';
  }
}

async function saveAdminSettings() {
  const editor = document.getElementById('settingsEditor');
  const inputs = editor.querySelectorAll('input');
  const payload = {};
  inputs.forEach(inp => { payload[inp.name] = inp.value; });

  try {
    await putJSON('/api/admin/settings', payload);
    adminFeedback.textContent = 'Settings saved.';
    adminFeedback.className = 'alert alert-success';
    adminFeedback.hidden = false;
    announce('Admin settings saved');
  } catch (err) {
    adminFeedback.textContent = `Error: ${err.message}`;
    adminFeedback.className = 'alert alert-error';
    adminFeedback.hidden = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */
function updateNav() {
  if (isLoggedIn()) {
    const user = getCurrentUser();
    navAuth.innerHTML = `<a href="user_profile.html">${escapeHTML(user.username || 'Profile')}</a>`;
  }
  if (isRole('admin')) {
    navAdmin.hidden = false;
    adminSection.hidden = false;
    loadAdminSettings();
  }
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */
async function init() {
  initTheme();
  themeToggle.addEventListener('click', () => cycleTheme());

  await checkAuth();

  if (!isLoggedIn() || !isRole('moderator')) {
    window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
    return;
  }

  updateNav();

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('aria-controls'));
    });
  });

  // Log filters
  document.getElementById('logFilterBtn').addEventListener('click', () => { logPage = 1; loadLog(); });
  document.getElementById('logClearBtn').addEventListener('click', () => {
    document.getElementById('logAction').value = '';
    document.getElementById('logSearch').value = '';
    document.getElementById('logStart').value = '';
    document.getElementById('logEnd').value = '';
    logPage = 1;
    loadLog();
  });

  // Admin save
  document.getElementById('saveSettingsBtn').addEventListener('click', saveAdminSettings);

  // Load first tab
  loadPending();
}

init();
