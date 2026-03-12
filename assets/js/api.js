let _csrfToken = null;
let _authToken = localStorage.getItem('auth_token');

export function setAuthToken(token) {
    _authToken = token;
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

export function getAuthToken() {
    return _authToken;
}

async function ensureCsrfToken() {
    if (_csrfToken) return _csrfToken;
    try {
        const res = await fetch('/api/auth/csrf.php');
        const json = await res.json();
        if (json.success && json.data.csrf_token) {
            _csrfToken = json.data.csrf_token;
        }
    } catch { /* no-op */ }
    return _csrfToken;
}

export async function fetchJSON(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    options.headers = options.headers || {};

    if (_authToken) {
        options.headers['Authorization'] = `Bearer ${_authToken}`;
    }

    if (method !== 'GET' && !_authToken) {
        const token = await ensureCsrfToken();
        if (token) options.headers['X-CSRF-TOKEN'] = token;
    }

    const res = await fetch(url, options);
    let json;
    try {
        json = await res.json();
    } catch {
        throw new Error('Invalid server response');
    }
    if (!res.ok || !json.success) {
        throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json.data;
}

export async function getJSON(url) { return fetchJSON(url); }

export async function postJSON(url, body) {
    return fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

export async function putJSON(url, body) {
    return fetchJSON(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

export async function deleteJSON(url) {
    return fetchJSON(url, { method: 'DELETE' });
}

export function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
