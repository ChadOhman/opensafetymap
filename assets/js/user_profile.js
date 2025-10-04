import { fetchJSON } from "./api.js";

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");

  try {
    const data = await fetchJSON(`/api/users/profile.php?id=${userId}`);
    document.getElementById("userName").innerText = data.user.username;
    document.getElementById("userMeta").innerText = `Role: ${data.user.role} | Status: ${data.user.status}`;

    const reportContainer = document.getElementById("reports");
    reportContainer.innerHTML = "";
    data.reports.forEach(r => {
      reportContainer.innerHTML += `
        <div class="card">
          <b>Report #${r.id}</b> (${r.status})<br>
          ${r.description}<br>
          <small>${r.timestamp}</small>
        </div>
      `;
    });

    const commentContainer = document.getElementById("comments");
    commentContainer.innerHTML = "";
    data.comments.forEach(c => {
      commentContainer.innerHTML += `
        <div class="card">
          ${c.content}<br>
          <small>${c.timestamp}</small>
        </div>
      `;
    });
  } catch (err) {
    alert("❌ Failed to load profile: " + err.message);
  }
}

loadProfile();
