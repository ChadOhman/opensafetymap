import { fetchJSON, escapeHTML } from "./api.js";

let severityChartInstance = null;
let incidentChartInstance = null;
let categoryChartInstance = null;
let timelineChartInstance = null;

function getFilters() {
  const start = document.getElementById("startDate")?.value || "";
  const end = document.getElementById("endDate")?.value || "";
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return qs ? "?" + qs : "";
}

async function loadCategoryChart() {
  const data = await fetchJSON("/api/stats/category.php" + getFilters());
  const labels = data.map(d => d.category);
  const counts = data.map(d => d.count);

  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(document.getElementById("categoryChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Reports by Category",
        data: counts,
        borderWidth: 1
      }]
    }
  });
}

async function loadTimelineChart() {
  const data = await fetchJSON("/api/stats/timeline.php" + getFilters());
  const labels = data.map(d => d.period);
  const counts = data.map(d => d.count);

  if (timelineChartInstance) timelineChartInstance.destroy();
  timelineChartInstance = new Chart(document.getElementById("timelineChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Reports Over Time",
        data: counts,
        borderWidth: 1,
        fill: false
      }]
    }
  });
}

async function loadSeverityChart() {
  const data = await fetchJSON("/api/stats/severity.php" + getFilters());
  const labels = data.map(d => d.severity);
  const counts = data.map(d => d.count);

  if (severityChartInstance) severityChartInstance.destroy();
  severityChartInstance = new Chart(document.getElementById("severityChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Reports by Severity",
        data: counts,
        borderWidth: 1
      }]
    }
  });
}

async function loadIncidentChart() {
  const data = await fetchJSON("/api/stats/incident.php" + getFilters());
  const labels = data.map(d => d.incident_type);
  const counts = data.map(d => d.count);

  if (incidentChartInstance) incidentChartInstance.destroy();
  incidentChartInstance = new Chart(document.getElementById("incidentChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: counts,
        borderWidth: 1
      }]
    }
  });
}

async function loadHeatmap() {
  const data = await fetchJSON("/api/stats/heatmap.php" + getFilters());
  const container = document.getElementById("heatmapContainer");
  if (!container) return;
  container.innerHTML = `<p>${escapeHTML(data.length)} data points loaded for heatmap.</p>`;
}

// Extend reloadDashboard
window.reloadDashboard = function() {
  document.querySelector(".dashboard").innerHTML = `
    <div class="card"><h2>Reports by Category</h2><canvas id="categoryChart"></canvas></div>
    <div class="card"><h2>Reports Over Time</h2><canvas id="timelineChart"></canvas></div>
    <div class="card"><h2>Reports by Severity</h2><canvas id="severityChart"></canvas></div>
    <div class="card"><h2>Reports by Incident Type</h2><canvas id="incidentChart"></canvas></div>
  `;
  loadCategoryChart();
  loadTimelineChart();
  loadSeverityChart();
  loadIncidentChart();
  loadHeatmap();
};

// Init
(async function init() {
  try {
    await loadCategoryChart();
    await loadTimelineChart();
    await loadSeverityChart();
    await loadIncidentChart();
    await loadHeatmap();
  } catch (err) {
    console.error("Dashboard failed:", err);
  }
})();
