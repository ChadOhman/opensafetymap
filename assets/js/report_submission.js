import { fetchJSON } from "./api.js";

document.getElementById("reportForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const formData = new FormData(this);

  // Get current map center (as fallback if user didn't click)
  const latInput = document.getElementById("lat");
  const lngInput = document.getElementById("lng");
  if (!latInput.value || !lngInput.value) {
    alert("❌ Please click on the map to select location.");
    return;
  }

  try {
    const data = await fetchJSON("/api/reports/submit.php", { method: "POST", body: formData });
    alert(`✅ Report submitted. Current status: ${data.status}`);
    this.reset();
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
});
