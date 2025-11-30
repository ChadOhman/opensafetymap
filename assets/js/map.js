import { fetchJSON } from "./api.js";

const map = L.map("map").setView([53.5461, -113.4938], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);

const locationStatus = document.getElementById("locationStatus");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const reportForm = document.getElementById("reportForm");
const feedback = document.getElementById("formFeedback");
let selectionMarker;

function setLocation(lat, lng) {
  latitudeInput.value = lat;
  longitudeInput.value = lng;
  locationStatus.textContent = `Location selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}. You can submit the form now.`;
  locationStatus.classList.remove("alert-error");
}

function showFeedback(message, tone = "") {
  feedback.textContent = message;
  feedback.classList.remove("alert-success", "alert-error");
  if (tone) {
    feedback.classList.add(tone);
  }
}

async function loadReports() {
  try {
    const reports = await fetchJSON("/api/reports/list.php");
    markers.clearLayers();
    reports.forEach(report => {
      const marker = L.marker([report.latitude, report.longitude]);
      marker.bindPopup(`
        <b>${report.category}</b> - ${report.severity}<br>
        ${report.incident_type}<br>
        ${report.description}<br>
        Status: ${report.status}<br>
        <small>${report.timestamp}</small><br>
        ${report.photo_url ? `<img src="${report.photo_url}" width="100" alt="Report photo">` : ""}
      `);
      markers.addLayer(marker);
    });
  } catch (err) {
    console.error("Failed to load reports", err);
    showFeedback("We couldn't load existing reports. Please try refreshing.", "alert-error");
  }
}

map.on("click", event => {
  const { lat, lng } = event.latlng;
  if (selectionMarker) {
    map.removeLayer(selectionMarker);
  }
  selectionMarker = L.marker([lat, lng], {
    keyboard: true,
    title: "Selected report location"
  }).addTo(map);
  setLocation(lat, lng);
});

if (reportForm) {
  reportForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!latitudeInput.value || !longitudeInput.value) {
      locationStatus.textContent = "Select a location on the map before submitting.";
      locationStatus.classList.add("alert-error");
      locationStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const formData = new FormData(reportForm);
    showFeedback("Submitting your report...", "alert");
    reportForm.setAttribute("aria-busy", "true");

    try {
      await fetchJSON("/api/reports/submit.php", { method: "POST", body: formData });
      showFeedback("Report submitted successfully!", "alert-success");
      reportForm.reset();
      latitudeInput.value = "";
      longitudeInput.value = "";
      if (selectionMarker) {
        map.removeLayer(selectionMarker);
        selectionMarker = null;
      }
      await loadReports();
    } catch (error) {
      console.error("Report submission failed", error);
      showFeedback(`Error: ${error.message}`, "alert-error");
    } finally {
      reportForm.removeAttribute("aria-busy");
    }
  });
}

loadReports();
