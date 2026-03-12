function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed: " + url);
  return await res.json();
}

async function loadLogs() {
  const logs = await fetchJSON("/api/moderation/log.php");
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";

  logs.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
  <td>${escapeHTML(l.id)}</td>
  <td>${escapeHTML(l.moderator)}</td>
  <td>${escapeHTML(l.action_type)}</td>
  <td>${escapeHTML(l.target_id)}</td>
  <td>${escapeHTML(l.details)}</td>
  <td>${escapeHTML(l.notes || "")}</td>
  <td>${escapeHTML(l.timestamp)}</td>
`;

    tbody.appendChild(tr);
  });
}

loadLogs();
