// Init map (center on Edmonton by default)
const map = L.map("map").setView([53.5461, -113.4938], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let marker;
map.on("click", function(e) {
  const { lat, lng } = e.latlng;
  document.getElementById("latitude").value = lat;
  document.getElementById("longitude").value = lng;

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map);
});

// Handle form submission
document.getElementById("reportForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const formData = new FormData(this);

  try {
    const res = await fetch("/api/report.php", {
      method: "POST",
      body: formData
    });
    const result = await res.json();

    if (result.status === "success") {
      document.getElementById("message").innerText = "✅ Report submitted successfully!";
      this.reset();
      if (marker) map.removeLayer(marker);
    } else {
      document.getElementById("message").innerText = "❌ Error: " + (result.error || "Submission failed");
    }
  } catch (err) {
    document.getElementById("message").innerText = "❌ Network error: " + err.message;
  }
});
