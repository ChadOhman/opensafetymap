// Centralized API Helper
export async function fetchJSON(url, options = {}) {
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
