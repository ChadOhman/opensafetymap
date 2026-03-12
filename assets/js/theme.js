const THEME_KEY = 'osm-theme';
const THEMES = ['auto', 'light', 'dark'];

export function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'auto';
}

export function applyTheme(theme) {
    if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme, isDark: isDark() } }));
}

export function isDark() {
    const theme = getStoredTheme();
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function cycleTheme() {
    const current = getStoredTheme();
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    applyTheme(next);
    return next;
}

export function initTheme() {
    applyTheme(getStoredTheme());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredTheme() === 'auto') {
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'auto', isDark: isDark() } }));
        }
    });
}
