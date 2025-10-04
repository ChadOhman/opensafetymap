async function loadSeverityChart() {
  const data = await fetchJSON("/api/stats/severity.php" + getFilters());
  const labels = data.map(d => d.severity);
  const counts = data.map(d => d.count);

  new Chart(document.getElementById("severityChart"), {
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

  new Chart(document.getElementById("incidentChart"), {
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

// Extend reloadDashboard
function reloadDashboard() {
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
}

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
