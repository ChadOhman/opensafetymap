const LOCATION_KEY = 'osm-last-location';
const DEFAULT_LOCATION = { lat: 0, lng: 0, zoom: 2 };

export function getCachedLocation() {
    try {
        const cached = JSON.parse(localStorage.getItem(LOCATION_KEY));
        if (cached && cached.lat != null && cached.lng != null) return cached;
    } catch { /* ignore */ }
    return null;
}

export function cacheLocation(lat, lng, zoom) {
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng, zoom }));
}

export function parseHashLocation() {
    const hash = window.location.hash.replace('#', '');
    const parts = hash.split(',').map(Number);
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        return { lat: parts[0], lng: parts[1], zoom: parts[2] };
    }
    return null;
}

export function setHashLocation(lat, lng, zoom) {
    window.history.replaceState(null, '', `#${lat.toFixed(5)},${lng.toFixed(5)},${zoom}`);
}

export async function detectLocation() {
    const hashLoc = parseHashLocation();
    if (hashLoc) return hashLoc;

    const cached = getCachedLocation();

    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 8000, maximumAge: 300000
            });
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 13 };
    } catch { /* denied or unavailable */ }

    try {
        const res = await fetch('/api/location/ip');
        const json = await res.json();
        if (json.success && json.data.latitude) {
            return { lat: json.data.latitude, lng: json.data.longitude, zoom: 11 };
        }
    } catch { /* ignore */ }

    return cached || DEFAULT_LOCATION;
}
