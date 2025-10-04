import { fetchJSON } from "./api.js";

const map = L.map("map").setView([53.5461, -113.4938], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);

async function loadReports() {
  try {
    const reports = await fetchJSON("/api/reports/list.php");
    markers.clearLayers();
    reports.forEach(r => {
      const marker = L.marker([r.latitude, r.longitude]);
      marker.bindPopup(`
        <b>${r.category}</b> - ${r.severity}<br>
        ${r.incident_type}<br>
        ${r.description}<br>
        Status: ${r.status}<br>
        <small>${r.timestamp}</small><br>
        ${r.photo_url ? `<img src="${r.photo_url}" width="100">` : ""}
      `);
      markers.addLayer(marker);
    });
  } catch (err) {
    console.error("Failed to load reports", err);
  }
}

loadReports();
