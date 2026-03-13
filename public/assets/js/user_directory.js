import { getJSON, postJSON, escapeHTML } from './api.js';
import { checkAuth, isLoggedIn, isRole, getCurrentUser } from './auth.js';
import { initTheme, cycleTheme } from './theme.js';
import { announce } from './utils.js';

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */
const userTableBody = document.getElementById('userTableBody');
const paginationEl  = document.getElementById('pagination');
const searchBox     = document.getElementById('searchBox');
const roleFilter    = document.getElementById('roleFilter');
const statusFilter  = document.getElementById('statusFilter');
const applyBtn      = document.getElementById('applyBtn');
const navAuth       = document.getElementById('nav-auth');
const themeToggle   = document.getElementById('themeToggle');

let currentPage = 1;
const perPage = 20;

/* ------------------------------------------------------------------ */
/*  Load users                                                         */
/* ------------------------------------------------------------------ */
async function loadUsers(page) {
  currentPage = page;
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage)
  });

  const search = searchBox.value.trim();
  const role   = roleFilter.value;
  const st     = statusFilter.value;

  if (search) params.set('search', search);
  if (role)   params.set('role', role);
  if (st)     params.set('status', st);

  try {
    const data = await getJSON(`/api/users/list?${params.toString()}`);
    const users = data.users || data || [];
    const total = data.total || users.length;

    renderUsers(users);
    renderPagination(total);
    announce(`${users.length} user(s) shown, page ${page}`);
  } catch (err) {
    console.error('Failed to load users', err);
    userTableBody.innerHTML = '<tr><td colspan="8">Failed to load users.</td></tr>';
  }
}

function renderUsers(users) {
  userTableBody.innerHTML = '';

  if (users.length === 0) {
    userTableBody.innerHTML = '<tr><td colspan="8">No users found.</td></tr>';
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');

    // Role dropdown
    const roleSelect = `
      <select class="role-select" data-user-id="${escapeHTML(u.id)}" aria-label="Role for ${escapeHTML(u.username || u.name || '')}">
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
        <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderator</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    `;

    // Ban/unban button
    const isBanned = u.status === 'banned';
    const banBtn = isBanned
      ? `<button type="button" class="btn btn-sm btn-success unban-btn" data-user-id="${escapeHTML(u.id)}">Unban</button>`
      : `<button type="button" class="btn btn-sm btn-danger ban-btn" data-user-id="${escapeHTML(u.id)}">Ban</button>`;

    tr.innerHTML = `
      <td>${escapeHTML(u.id)}</td>
      <td>${escapeHTML(u.username || u.name || '')}</td>
      <td>${escapeHTML(u.email || '')}</td>
      <td>${escapeHTML(u.oauth_provider || u.provider || '')}</td>
      <td>${roleSelect}</td>
      <td><span class="badge ${isBanned ? 'badge-rejected' : 'badge-approved'}">${escapeHTML(u.status || 'active')}</span></td>
      <td>${escapeHTML(u.created_at || '')}</td>
      <td class="user-actions">${banBtn}</td>
    `;

    // Role change listener
    const select = tr.querySelector('.role-select');
    select.addEventListener('change', () => changeRole(u.id, select.value));

    // Ban/unban listener
    const actionBtn = tr.querySelector('.ban-btn, .unban-btn');
    if (actionBtn) {
      if (actionBtn.classList.contains('ban-btn')) {
        actionBtn.addEventListener('click', () => banUser(u.id));
      } else {
        actionBtn.addEventListener('click', () => unbanUser(u.id));
      }
    }

    userTableBody.appendChild(tr);
  });
}

function renderPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  paginationEl.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'btn btn-sm btn-secondary';
  prev.textContent = 'Previous';
  prev.disabled = currentPage <= 1;
  prev.addEventListener('click', () => loadUsers(currentPage - 1));

  const info = document.createElement('span');
  info.textContent = `Page ${currentPage} of ${totalPages}`;

  const next = document.createElement('button');
  next.className = 'btn btn-sm btn-secondary';
  next.textContent = 'Next';
  next.disabled = currentPage >= totalPages;
  next.addEventListener('click', () => loadUsers(currentPage + 1));

  paginationEl.append(prev, info, next);
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */
async function changeRole(userId, newRole) {
  try {
    await postJSON('/api/users/role', { user_id: userId, role: newRole });
    announce(`User ${userId} role changed to ${newRole}`);
    loadUsers(currentPage);
  } catch (err) {
    console.error('Role change failed', err);
    announce('Failed to change role');
  }
}

async function banUser(userId) {
  try {
    await postJSON('/api/users/ban', { user_id: userId });
    announce(`User ${userId} banned`);
    loadUsers(currentPage);
  } catch (err) {
    console.error('Ban failed', err);
    announce('Failed to ban user');
  }
}

async function unbanUser(userId) {
  try {
    await postJSON('/api/users/unban', { user_id: userId });
    announce(`User ${userId} unbanned`);
    loadUsers(currentPage);
  } catch (err) {
    console.error('Unban failed', err);
    announce('Failed to unban user');
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
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */
async function init() {
  initTheme();
  themeToggle.addEventListener('click', () => cycleTheme());

  await checkAuth();

  if (!isLoggedIn() || !isRole('admin')) {
    window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
    return;
  }

  updateNav();

  // Search/filter events
  applyBtn.addEventListener('click', () => loadUsers(1));
  searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadUsers(1);
  });

  // Debounced search
  let searchTimer;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadUsers(1), 400);
  });

  loadUsers(1);
}

init();
