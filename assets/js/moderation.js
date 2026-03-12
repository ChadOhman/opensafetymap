import { fetchJSON, postJSON, escapeHTML } from "./api.js";

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
  const data = await fetchJSON("/api/reports/list.php?per_page=200");
  const container = document.getElementById("reports");
  container.innerHTML = "";
  data.reports.filter(r => r.status === "pending").forEach(r => {
    container.innerHTML += `
      <div class="card">
        <b>${escapeHTML(r.category)}</b> • Severity: ${escapeHTML(r.severity)}, Type: ${escapeHTML(r.incident_type)}<br>
        ${escapeHTML(r.description)}<br>
        <small>${escapeHTML(r.timestamp)}</small><br>
        <b>By:</b> ${escapeHTML(r.username)}<br>
        ${r.photo_url ? `<img src="${escapeHTML(r.photo_url)}" width="100" alt="Report photo">` : ""}
        <textarea id="notes-report-${r.id}" placeholder="Notes..."></textarea>
        <br>
        <button class="approve" onclick="moderateReport(${r.id}, 'approve')">Approve</button>
        <button class="reject" onclick="moderateReport(${r.id}, 'reject')">Reject</button>
      </div>`;
  });
}
window.moderateReport = async function(id, action) {
  try {
    const notes = document.getElementById(`notes-report-${id}`).value;
    await postJSON("/api/reports/moderate.php", { report_id: id, action, notes });
    loadPendingReports(); loadLogs(); loadAnalytics();
  } catch (err) {
    alert("Moderation failed: " + err.message);
  }
};

// === FLAGS ===
async function loadFlags() {
  const flags = await fetchJSON("/api/flags/list.php");
  const container = document.getElementById("flags");
  container.innerHTML = "";
  flags.forEach(f => {
    container.innerHTML += `
      <div class="card">
        <b>Flagged ${f.target_type === "report" ? "Report" : "Comment"} #${escapeHTML(f.target_id)}</b><br>
        Reason: ${escapeHTML(f.reason)}<br>
        <small>${escapeHTML(f.timestamp)}</small><br>
        <textarea id="notes-flag-${f.id}" placeholder="Notes..."></textarea>
        <br>
        <button class="dismiss" onclick="resolveFlag(${f.id}, 'dismiss')">Dismiss</button>
        <button class="remove" onclick="resolveFlag(${f.id}, 'remove')">Remove</button>
      </div>`;
  });
}
window.resolveFlag = async function(id, action) {
  try {
    const notes = document.getElementById(`notes-flag-${id}`).value;
    await postJSON("/api/flags/resolve.php", { flag_id: id, action, notes });
    loadFlags(); loadLogs(); loadAnalytics();
  } catch (err) {
    alert("Flag resolution failed: " + err.message);
  }
};

// === ANALYTICS ===
let trendChartInstance = null;
async function loadAnalytics() {
  const data = await fetchJSON("/api/admin/moderation_stats.php");
  document.getElementById("analyticsSummary").innerHTML = `
    <b>Total Reports:</b> ${escapeHTML(data.total)}<br>
    <b>Approved:</b> ${escapeHTML(data.approved)}<br>
    <b>Rejected:</b> ${escapeHTML(data.rejected)}<br>
    <b>Pending:</b> ${escapeHTML(data.pending)}<br>
    <b>Avg Resolution Time:</b> ${escapeHTML(data.avg_resolution_hours)} hours
  `;
  const ctx = document.getElementById("trendChart").getContext("2d");
  const labels = [...new Set(data.trend.map(t => t.week))].sort();
  const approvedData = labels.map(week => (data.trend.find(t => t.week == week && t.status === "approved")?.count) || 0);
  const rejectedData = labels.map(week => (data.trend.find(t => t.week == week && t.status === "rejected")?.count) || 0);

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(ctx, {
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
        <td>${escapeHTML(l.id)}</td><td>${escapeHTML(l.moderator)}</td><td>${escapeHTML(l.action_type)}</td>
        <td>${escapeHTML(l.target_id)}</td><td>${escapeHTML(l.details)}</td>
        <td>${escapeHTML(l.notes || "")}</td><td>${escapeHTML(l.timestamp)}</td>
      </tr>`;
  });
}
["actionFilter","logSearch","startDate","endDate"].forEach(id =>
  document.getElementById(id).addEventListener("input", renderLogs));

// === INIT ===
loadSettings(); loadPendingReports(); loadFlags(); loadAnalytics(); loadLogs();
