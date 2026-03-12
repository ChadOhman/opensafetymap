import { getJSON, setAuthToken, getAuthToken } from './api.js';

let _currentUser = null;

export async function checkAuth() {
    try {
        _currentUser = await getJSON('/api/auth/session.php');
        return _currentUser;
    } catch {
        _currentUser = null;
        return null;
    }
}

export function getCurrentUser() { return _currentUser; }

export function isLoggedIn() { return _currentUser !== null; }

export function isRole(role) {
    const roles = { user: 1, moderator: 2, admin: 3 };
    return _currentUser && roles[_currentUser.role] >= roles[role];
}

export async function logout() {
    try {
        await fetch('/api/auth/logout.php', {
            method: 'POST',
            headers: getAuthToken()
                ? { 'Authorization': `Bearer ${getAuthToken()}` }
                : {}
        });
    } catch { /* ignore */ }
    setAuthToken(null);
    _currentUser = null;
    window.location.href = '/';
}

export function handleOAuthResult(data) {
    if (data.token) {
        setAuthToken(data.token);
    }
    _currentUser = data.user;
}
