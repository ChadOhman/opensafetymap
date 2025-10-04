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
  <td>${l.id}</td>
  <td>${l.moderator}</td>
  <td>${l.action_type}</td>
  <td>${l.target_id}</td>
  <td>${l.details}</td>
  <td>${l.notes || ""}</td>
  <td>${l.timestamp}</td>
`;

    tbody.appendChild(tr);
  });
}

loadLogs();
