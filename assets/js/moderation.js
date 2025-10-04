import { fetchJSON, postJSON } from "./api.js";

// === SETTINGS ===
async function loadSettings() {
  const { require_approval } = await fetchJSON("/api/admin/settings.php");
  document.getElementById("requireApproval").checked = require_approval;
}
document.getElementById("requireApproval").addEventListener("change", async function() {
  await postJSON("/api/admin/settings.php", { require_approval: this.checked });
});

// === REPORTS ===
async function loadPendingReports() {
  const reports = await fetchJSON("/api/reports/list.php");
  const container = document.getElementById("reports");
  container.innerHTML = "";
  reports.filter(r => r.status === "pending").forEach(r => {
    container.innerHTML += `
      <div class="card">
        <b>${r.category}</b> • Severity: ${r.severity}, Type: ${r.incident_type}<br>
        ${r.description}<br>
        <small>${r.timestamp}</small><br>
        <b>By:</b> ${r.username}<br>
        ${r.photo_url ? `<img src="${r.photo_url}" width="100">` : ""}
        <textarea id="notes-report-${r.id}" placeholder="Notes..."></textarea>
        <br>
        <button class="approve" onclick="moderateReport(${r.id}, 'approve')">Approve</button>
        <button class="reject" onclick="moderateReport(${r.id}, 'reject')">Reject</button>
      </div>`;
  });
}
window.moderateReport = async function(id, action) {
  const notes = document.getElementById(`notes-report-${id}`).value;
  await postJSON("/api/reports/moderate.php", { report_id: id, action, notes });
  loadPendingReports(); loadLogs(); loadAnalytics();
};

// === FLAGS ===
async function loadFlags() {
  const flags = await fetchJSON("/api/flags/list.php");
  const container = document.getElementById("flags");
  container.innerHTML = "";
  flags.forEach(f => {
    container.innerHTML += `
      <div class="card">
        <b>Flagged ${f.report_id ? "Report" : "Comment"} #${f.report_id || f.comment_id}</b><br>
        Reason: ${f.reason}<br>
        <small>${f.timestamp}</small><br>
        <textarea id="notes-flag-${f.id}" placeholder="Notes..."></textarea>
        <br>
        <button class="dismiss" onclick="resolveFlag(${f.id}, 'dismiss')">Dismiss</button>
        <button class="remove" onclick="resolveFlag(${f.id}, 'remove')">Remove</button>
      </div>`;
  });
}
window.resolveFlag = async function(id, action) {
  const notes = document.getElementById(`notes-flag-${id}`).value;
  await postJSON("/api/flags/resolve.php", { flag_id: id, action, notes });
  loadFlags(); loadLogs(); loadAnalytics();
};

// === ANALYTICS ===
async function loadAnalytics() {
  const data = await fetchJSON("/api/admin/moderation_stats.php");
  document.getElementById("analyticsSummary").innerHTML = `
    <b>Total Reports:</b> ${data.total}<br>
    <b>Approved:</b> ${data.approved}<br>
    <b>Rejected:</b> ${data.rejected}<br>
    <b>Pending:</b> ${data.pending}<br>
    <b>Avg Resolution Time:</b> ${data.avg_resolution_hours} hours
  `;
  const ctx = document.getElementById("trendChart").getContext("2d");
  const labels = [...new Set(data.trend.map(t => t.week))].sort();
  const approvedData = labels.map(week => (data.trend.find(t => t.week == week && t.status === "approved")?.count) || 0);
  const rejectedData = labels.map(week => (data.trend.find(t => t.week == week && t.status === "rejected")?.count) || 0);

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Approved", data: approvedData, borderColor: "green", fill: false },
        { label: "Rejected", data: rejectedData, borderColor: "red", fill: false }
      ]
    }
  });
}

// === LOG ===
let allLogs = [];
async function loadLogs() { allLogs = await fetchJSON("/api/moderation/log.php"); renderLogs(); }
function renderLogs() {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";

  const filter = document.getElementById("actionFilter").value;
  const search = document.getElementById("logSearch").value.toLowerCase();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  const filtered = allLogs.filter(l => {
    if (filter && l.action_type !== filter) return false;
    if (search) {
      const text = `${l.moderator} ${l.target_id} ${l.details} ${l.notes || ""}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    const d = new Date(l.timestamp);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate); end.setHours(23,59,59,999);
      if (d > end) return false;
    }
    return true;
  });

  filtered.forEach(l => {
    tbody.innerHTML += `
      <tr>
        <td>${l.id}</td><td>${l.moderator}</td><td>${l.action_type}</td>
        <td>${l.target_id}</td><td>${l.details}</td>
        <td>${l.notes || ""}</td><td>${l.timestamp}</td>
      </tr>`;
  });
}
["actionFilter","logSearch","startDate","endDate"].forEach(id =>
  document.getElementById(id).addEventListener("input", renderLogs));

// === INIT ===
loadSettings(); loadPendingReports(); loadFlags(); loadAnalytics(); loadLogs();
