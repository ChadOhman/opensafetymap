import { getJSON, putJSON, deleteJSON, escapeHTML } from './api.js';
import { checkAuth, getCurrentUser, isLoggedIn, isRole, logout } from './auth.js';
import { initTheme, cycleTheme } from './theme.js';

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */
const profileAvatar     = document.getElementById('profileAvatar');
const profileName       = document.getElementById('profileName');
const profileMeta       = document.getElementById('profileMeta');
const reportsBody       = document.getElementById('reportsBody');
const reportsPagination = document.getElementById('reportsPagination');
const settingsForm      = document.getElementById('settingsForm');
const settingsUsername   = document.getElementById('settingsUsername');
const settingsPrivacy    = document.getElementById('settingsPrivacy');
const settingsFeedback   = document.getElementById('settingsFeedback');
const sessionsList      = document.getElementById('sessionsList');
const logoutBtn         = document.getElementById('logoutBtn');
const navAuth           = document.getElementById('nav-auth');
const navModerate       = document.getElementById('nav-moderate');
const themeToggle       = document.getElementById('themeToggle');
const status            = document.getElementById('status');

let currentPage = 1;
const perPage = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function announce(msg) {
  if (status) status.textContent = msg;
}

function statusBadge(st) {
  const cls = st === 'approved' ? 'badge-approved' : st === 'rejected' ? 'badge-rejected' : 'badge-pending';
  return `<span class="badge ${cls}">${escapeHTML(st)}</span>`;
}

/* ------------------------------------------------------------------ */
/*  Profile rendering                                                  */
/* ------------------------------------------------------------------ */
function renderProfile(user) {
  const initial = (user.username || user.email || '?')[0].toUpperCase();
  profileAvatar.textContent = initial;
  profileName.textContent = escapeHTML(user.username || user.email || 'User');
  profileMeta.innerHTML = `
    Role: ${escapeHTML(user.role || 'user')} &middot;
    Provider: ${escapeHTML(user.provider || '')} &middot;
    Joined: ${escapeHTML(user.created_at || '')}
  `;
  settingsUsername.value = user.username || '';
  settingsPrivacy.value = user.privacy || 'public';
}

/* ------------------------------------------------------------------ */
/*  Reports                                                            */
/* ------------------------------------------------------------------ */
async function loadReports(page) {
  currentPage = page;
  try {
    const data = await getJSON(`/api/reports/mine.php?page=${page}&per_page=${perPage}`);
    const reports = data.reports || data || [];
    const total = data.total || reports.length;

    reportsBody.innerHTML = '';
    if (reports.length === 0) {
      reportsBody.innerHTML = '<tr><td colspan="5">No reports yet.</td></tr>';
    } else {
      reports.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHTML(r.id)}</td>
          <td>${escapeHTML(r.incident_type || r.incident_type_name || '')}</td>
          <td>${escapeHTML(r.severity || r.severity_name || '')}</td>
          <td>${statusBadge(r.status || 'pending')}</td>
          <td>${escapeHTML(r.created_at || r.timestamp || '')}</td>
        `;
        reportsBody.appendChild(tr);
      });
    }

    renderPagination(total);
    announce(`Showing page ${page} of reports`);
  } catch (err) {
    console.error('Failed to load reports', err);
    reportsBody.innerHTML = '<tr><td colspan="5">Failed to load reports.</td></tr>';
  }
}

function renderPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  reportsPagination.innerHTML = '';

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-sm btn-secondary';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener('click', () => loadReports(currentPage - 1));

  const info = document.createElement('span');
  info.textContent = `Page ${currentPage} of ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-sm btn-secondary';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => loadReports(currentPage + 1));

  reportsPagination.append(prevBtn, info, nextBtn);
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */
async function loadSessions() {
  try {
    const data = await getJSON('/api/auth/tokens.php');
    const tokens = data.tokens || data || [];
    sessionsList.innerHTML = '';

    if (tokens.length === 0) {
      sessionsList.innerHTML = '<p class="text-secondary text-sm">No active sessions.</p>';
      return;
    }

    tokens.forEach(t => {
      const div = document.createElement('div');
      div.className = 'session-item';
      const isCurrent = t.is_current;
      div.innerHTML = `
        <div>
          <div>${escapeHTML(t.user_agent || 'Unknown device')}</div>
          <div class="session-info">
            Created: ${escapeHTML(t.created_at || '')}
            ${isCurrent ? '<span class="session-current">(Current session)</span>' : ''}
          </div>
        </div>
      `;

      if (!isCurrent) {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-sm btn-danger';
        revokeBtn.textContent = 'Revoke';
        revokeBtn.addEventListener('click', async () => {
          try {
            await deleteJSON(`/api/auth/tokens.php?id=${encodeURIComponent(t.id)}`);
            await loadSessions();
            announce('Session revoked');
          } catch (err) {
            console.error('Revoke failed', err);
          }
        });
        div.appendChild(revokeBtn);
      }

      sessionsList.appendChild(div);
    });
  } catch {
    sessionsList.innerHTML = '<p class="text-secondary text-sm">Could not load sessions.</p>';
  }
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */
async function handleSettings(e) {
  e.preventDefault();
  settingsFeedback.hidden = true;
  try {
    await putJSON('/api/users/settings.php', {
      username: settingsUsername.value.trim(),
      privacy: settingsPrivacy.value
    });
    settingsFeedback.textContent = 'Settings saved.';
    settingsFeedback.className = 'alert alert-success';
    settingsFeedback.hidden = false;
    announce('Settings saved');
  } catch (err) {
    settingsFeedback.textContent = `Error: ${err.message}`;
    settingsFeedback.className = 'alert alert-error';
    settingsFeedback.hidden = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */
function updateNav() {
  if (isLoggedIn()) {
    const user = getCurrentUser();
    navAuth.innerHTML = `<a href="user_profile.html" aria-current="page">${escapeHTML(user.username || 'Profile')}</a>`;
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
  themeToggle.addEventListener('click', () => cycleTheme());

  await checkAuth();

  if (!isLoggedIn()) {
    window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
    return;
  }

  updateNav();
  renderProfile(getCurrentUser());
  loadReports(1);
  loadSessions();

  settingsForm.addEventListener('submit', handleSettings);
  logoutBtn.addEventListener('click', () => logout());
}

init();
