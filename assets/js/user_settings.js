document.getElementById("settingsForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const formData = {
    username: document.getElementById("username").value,
    privacy: document.getElementById("privacy").value
  };

  try {
    const res = await fetch("/api/user/update_settings.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const result = await res.json();
    if (result.status === "success") {
      document.getElementById("message").innerText = "✅ Settings updated!";
    } else {
      document.getElementById("message").innerText = "❌ Error: " + (result.error || "Failed to update");
    }
  } catch (err) {
    document.getElementById("message").innerText = "❌ Network error: " + err.message;
  }
});
