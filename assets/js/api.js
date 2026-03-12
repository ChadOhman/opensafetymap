// Centralized API Helper
let _csrfToken = null;

async function ensureCsrfToken() {
  if (_csrfToken) return _csrfToken;
  const res = await fetch("/api/auth/csrf.php");
  const json = await res.json();
  if (json.status === "success" && json.data.csrf_token) {
    _csrfToken = json.data.csrf_token;
  }
  return _csrfToken;
}

export async function fetchJSON(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") {
    const token = await ensureCsrfToken();
    if (token) {
      options.headers = options.headers || {};
      if (options.headers instanceof Headers) {
        options.headers.set("X-CSRF-TOKEN", token);
      } else {
        options.headers["X-CSRF-TOKEN"] = token;
      }
    }
  }

  const res = await fetch(url, options);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid server response");
  }
  if (!res.ok || json.status !== "success") {
    throw new Error(json.error || "Request failed");
  }
  return json.data;
}

// Convenience wrappers
export async function getJSON(url) {
  return fetchJSON(url);
}

export async function postJSON(url, body) {
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
