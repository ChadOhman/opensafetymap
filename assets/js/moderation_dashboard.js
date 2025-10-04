// Fetch JSON helper
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Failed request: " + url);
  return await res.json();
}

// Load flags from backend
async function loadFlags() {
  const data = await fetchJSON("/api/flags.php");
  const tbody = document.querySelector("#flagsTable tbody");
  tbody.innerHTML = "";

  data.forEach(flag => {
    const tr = document.createElement("tr");

    // Content: description if report, comment if comment
    let content = flag.target_type === "report" ? flag.report_description : flag.comment_content;

    // Photo (only if report & has photo_url)
    let photo = flag.photo_url ? `<a href="${flag.photo_url}" target="_blank">View Photo</a>` : "-";

    tr.innerHTML = `
      <td>${flag.id}</td>
      <td>${flag.target_type}</td>
      <td>${flag.target_id}</td>
      <td>${flag.flagged_by}</td>
      <td>${flag.category || "-"}</td>
      <td>${flag.severity || "-"}</td>
      <td>${flag.incident_type || "-"}</td>
      <td>${content || "-"}</td>
      <td>${photo}</td>
      <td>${flag.reason}</td>
      <td>${flag.status}</td>
      <td>${flag.timestamp}</td>
      <td>
        <button class="btn btn-dismiss" onclick="updateFlag(${flag.id}, 'dismissed')">Dismiss</button>
        <button class="btn btn-remove" onclick="removeContent('${flag.target_type}', ${flag.target_id}, ${flag.id})">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


// Update flag status
async function updateFlag(flagId, status) {
  await fetchJSON("/api/flag.php", {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `id=${flagId}&status=${status}`
  });
  loadFlags();
}

// Remove flagged content (report or comment) + update flag
async function removeContent(type, targetId, flagId) {
  const endpoint = type === "report" ? "/api/report.php" : "/api/comment.php";

  await fetch(endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `id=${targetId}`
  });

  await updateFlag(flagId, "removed");
  loadFlags();
}

// Init dashboard
loadFlags();
