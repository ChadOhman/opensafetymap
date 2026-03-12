import { fetchJSON, escapeHTML } from "./api.js";

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
          <b>Report #${escapeHTML(r.id)}</b> (${escapeHTML(r.status)})<br>
          ${escapeHTML(r.description)}<br>
          <small>${escapeHTML(r.timestamp)}</small>
        </div>
      `;
    });

    const commentContainer = document.getElementById("comments");
    commentContainer.innerHTML = "";
    data.comments.forEach(c => {
      commentContainer.innerHTML += `
        <div class="card">
          ${escapeHTML(c.content)}<br>
          <small>${escapeHTML(c.timestamp)}</small>
        </div>
      `;
    });
  } catch (err) {
    alert("Failed to load profile: " + err.message);
  }
}

loadProfile();
