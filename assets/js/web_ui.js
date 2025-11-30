const map = L.map("map").setView([53.5461, -113.4938], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

const locationStatus = document.getElementById("locationStatus");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
let selectionMarker;

const reportFeedback = document.getElementById("formFeedback");
const driverFeedback = document.getElementById("driverFeedback");
const driverReportsContainer = document.getElementById("driverReports");
const publicFeed = document.getElementById("publicFeed");
const moderationQueue = document.getElementById("moderationQueue");
const userTableBody = document.getElementById("userTableBody");

const visibilityFilter = document.getElementById("visibilityFilter");
const categoryFilter = document.getElementById("categoryFilter");

const reportForm = document.getElementById("reportForm");
const driverForm = document.getElementById("driverVerificationForm");

const users = [
  { id: 1, name: "Pat Jordan", email: "pat@example.com", role: "Admin" },
  { id: 2, name: "Lee Chen", email: "lee@example.com", role: "Moderator" },
  { id: 3, name: "Alex Garcia", email: "alex@example.com", role: "User" },
];

const reports = [
  {
    id: 1,
    plate: "ABC1234",
    category: "Accident",
    incidentType: "Collision",
    description: "Rear-end collision at low speed. Minor bumper damage and no injuries reported.",
    latitude: 53.543,
    longitude: -113.49,
    status: "published",
    reporter: "Taylor",
    reporterContact: "taylor@example.com",
    reporterComment: "Vehicle failed to stop at light.",
    driverResponse: "We contacted insurance and have booked repairs. Sorry for the delay.",
    responseNotified: true,
    attachments: {
      photos: ["/assets/sample/plate-abc1234.jpg"],
      video: "https://example.com/dashcam/abc1234"
    }
  },
  {
    id: 2,
    plate: "XYZ5678",
    category: "Near-miss",
    incidentType: "Close pass / near-miss",
    description: "Cyclist was passed within 30cm on a narrow street. No collision but very close call.",
    latitude: 53.547,
    longitude: -113.52,
    status: "published",
    reporter: "Jordan",
    reporterContact: "",
    reporterComment: "Driver crossed solid line to pass.",
    driverResponse: "Reviewed dashcam and will give more space going forward.",
    responseNotified: true,
    attachments: {
      photos: [],
      video: ""
    }
  },
  {
    id: 3,
    plate: "LMN9001",
    category: "Irritant",
    incidentType: "High beams or no lights",
    description: "Pickup truck drove several blocks with high beams in heavy fog.",
    latitude: 53.55,
    longitude: -113.47,
    status: "pending",
    reporter: "Casey",
    reporterContact: "casey@example.com",
    reporterComment: "Blinding oncoming traffic overnight.",
    driverResponse: "",
    responseNotified: false,
    attachments: {
      photos: ["/assets/sample/fog.jpg"],
      video: ""
    }
  }
];

function anonymizePlate(plate) {
  if (!plate) return "";
  return plate.substring(0, 3).toUpperCase() + "****";
}

function setLocation(lat, lng) {
  latitudeInput.value = lat;
  longitudeInput.value = lng;
  locationStatus.textContent = `Location selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}. You can submit the form now.`;
  locationStatus.classList.remove("alert-error");
}

function showFeedback(element, message, tone = "alert-info") {
  element.textContent = message;
  element.className = `alert ${tone}`;
}

function renderMap() {
  markerCluster.clearLayers();
  const includePending = visibilityFilter.value === "pending";
  const category = categoryFilter.value;

  reports
    .filter(report => includePending || report.status === "published")
    .filter(report => category === "All" || report.category === category)
    .forEach(report => {
      const marker = L.marker([report.latitude, report.longitude]);
      const popup = `
        <strong>${report.category}</strong> · ${report.incidentType}<br>
        Plate: ${anonymizePlate(report.plate)}<br>
        Reporter: ${report.reporterComment || "No comment"}<br>
        ${report.driverResponse ? `Driver: ${report.driverResponse}<br>` : ""}
        Status: ${report.status}
      `;
      marker.bindPopup(popup);
      markerCluster.addLayer(marker);
    });
}

function createAttachmentList(attachments) {
  const list = document.createElement("ul");
  list.className = "helper-text";

  if (attachments.photos && attachments.photos.length) {
    const photos = document.createElement("li");
    photos.textContent = `Photos: ${attachments.photos.map(p => p.split("/").pop()).join(", ")}`;
    list.appendChild(photos);
  }

  if (attachments.video) {
    const video = document.createElement("li");
    video.textContent = `Video: ${attachments.video}`;
    list.appendChild(video);
  }

  if (!list.children.length) {
    const empty = document.createElement("li");
    empty.textContent = "No evidence attached";
    list.appendChild(empty);
  }

  return list;
}

function renderPublicFeed() {
  publicFeed.innerHTML = "";
  const includePending = visibilityFilter.value === "pending";
  const category = categoryFilter.value;

  reports
    .filter(report => includePending || report.status === "published")
    .filter(report => category === "All" || report.category === category)
    .forEach(report => {
      const item = document.createElement("article");
      item.className = "feed-item";
      item.innerHTML = `
        <div class="card-header">
          <div><strong>${report.category}</strong> · ${report.incidentType}</div>
          <span class="badge badge-primary">${anonymizePlate(report.plate)}</span>
        </div>
        <p class="card-meta">${report.description}</p>
        <p><strong>Reporter:</strong> ${report.reporterComment || "No reporter comment"}</p>
        ${report.driverResponse ? `<p><strong>Driver:</strong> ${report.driverResponse}</p>` : "<p class=\"card-meta\">Driver has not responded yet.</p>"}
        <p class="card-meta">Status: ${report.status === "published" ? "Visible to public" : "Pending moderation"}${report.responseNotified ? " · Reporter notified" : ""}</p>
      `;
      item.appendChild(createAttachmentList(report.attachments));
      publicFeed.appendChild(item);
    });
}

function renderModerationQueue() {
  moderationQueue.innerHTML = "";
  reports.forEach(report => {
    const panel = document.createElement("div");
    panel.className = "card";
    panel.innerHTML = `
      <div class="card-header">
        <div><strong>${report.category}</strong> · ${report.incidentType}</div>
        <span class="badge">${report.status}</span>
      </div>
      <p class="card-meta">Plate: ${anonymizePlate(report.plate)} · Reporter: ${report.reporter || "Anonymous"}</p>
      <p>${report.description}</p>
      <p class="card-meta">Attachments: ${(report.attachments.photos?.length || 0)} photo(s)${report.attachments.video ? " · video link" : ""}</p>
      <div class="action-buttons">
        <button data-action="approve" data-id="${report.id}" class="approve">Approve</button>
        <button data-action="edit" data-id="${report.id}" class="secondary">Edit text</button>
        <button data-action="remove" data-id="${report.id}" class="remove">Remove</button>
      </div>
    `;
    moderationQueue.appendChild(panel);
  });
}

function renderUsers() {
  userTableBody.innerHTML = "";
  users.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>
        <select data-id="${user.id}" class="role-select">
          <option ${user.role === "Admin" ? "selected" : ""}>Admin</option>
          <option ${user.role === "Moderator" ? "selected" : ""}>Moderator</option>
          <option ${user.role === "User" ? "selected" : ""}>User</option>
        </select>
      </td>
      <td class="action-buttons">
        <button class="secondary" data-action="promote" data-id="${user.id}">Save role</button>
        <button class="remove" data-action="remove" data-id="${user.id}">Remove</button>
      </td>
    `;
    userTableBody.appendChild(row);
  });
}

function renderDriverReports(plate) {
  driverReportsContainer.innerHTML = "";
  const matches = reports.filter(report => report.plate.toUpperCase() === plate.toUpperCase());

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "card-meta";
    empty.textContent = "No reports linked to this plate yet.";
    driverReportsContainer.appendChild(empty);
    return;
  }

  matches.forEach(report => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div><strong>${report.category}</strong> · ${report.incidentType}</div>
        <span class="badge badge-primary">${anonymizePlate(report.plate)}</span>
      </div>
      <p class="card-meta">${report.description}</p>
      <p><strong>Reporter:</strong> ${report.reporterComment || "No reporter comment"}</p>
      ${report.driverResponse ? `<p><strong>Your response:</strong> ${report.driverResponse}</p>` : ""}
      <form data-report="${report.id}" class="driver-response stack">
        <label for="response-${report.id}">Respond to reporter</label>
        <textarea id="response-${report.id}" required placeholder="Share your perspective, fixes made, or supporting documents."></textarea>
        <div class="form-actions">
          <button type="submit" class="primary">Send response</button>
        </div>
        <p class="helper-text">Reporter will be notified after you submit.</p>
      </form>
    `;
    driverReportsContainer.appendChild(card);
  });
}

function captureFiles(input) {
  if (!input || !input.files || !input.files.length) return [];
  return Array.from(input.files).map(file => file.name);
}

map.on("click", event => {
  const { lat, lng } = event.latlng;
  if (selectionMarker) {
    map.removeLayer(selectionMarker);
  }
  selectionMarker = L.marker([lat, lng], {
    keyboard: true,
    title: "Selected report location",
  }).addTo(map);
  setLocation(lat, lng);
});

if (reportForm) {
  reportForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!latitudeInput.value || !longitudeInput.value) {
      locationStatus.textContent = "Select a location on the map before submitting.";
      locationStatus.classList.add("alert-error");
      locationStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const newReport = {
      id: reports.length + 1,
      plate: document.getElementById("plate").value.trim(),
      category: document.getElementById("incidentCategory").value,
      incidentType: document.getElementById("incidentType").value,
      description: document.getElementById("description").value.trim(),
      latitude: Number(latitudeInput.value),
      longitude: Number(longitudeInput.value),
      status: "pending",
      reporter: document.getElementById("reporterName").value.trim() || "Anonymous",
      reporterContact: document.getElementById("reporterContact").value.trim(),
      reporterComment: document.getElementById("description").value.trim(),
      driverResponse: "",
      responseNotified: false,
      attachments: {
        photos: captureFiles(document.getElementById("photoEvidence")),
        video: document.getElementById("videoEvidence").value.trim()
      }
    };

    reports.unshift(newReport);
    renderMap();
    renderPublicFeed();
    renderModerationQueue();
    reportForm.reset();
    if (selectionMarker) {
      map.removeLayer(selectionMarker);
      selectionMarker = null;
    }
    latitudeInput.value = "";
    longitudeInput.value = "";
    showFeedback(reportFeedback, "Report submitted. It will be moderated before public display.", "alert-success");
  });
}

if (driverForm) {
  driverForm.addEventListener("submit", event => {
    event.preventDefault();
    const plate = document.getElementById("driverPlate").value.trim();
    const registrationNumber = document.getElementById("registrationNumber").value.trim();
    const platePhoto = document.getElementById("platePhoto").files?.length || 0;

    if (!plate) {
      showFeedback(driverFeedback, "Enter a plate number to continue.", "alert-error");
      return;
    }

    if (!registrationNumber && !platePhoto) {
      showFeedback(driverFeedback, "Add a registration number or plate photo to verify.", "alert-error");
      return;
    }

    renderDriverReports(plate);
    showFeedback(driverFeedback, "Verified. Reports for this plate are ready and responses will notify reporters.", "alert-success");
  });
}

function handleDriverResponse(event) {
  if (!event.target.matches("form.driver-response")) return;
  event.preventDefault();
  const form = event.target;
  const id = Number(form.getAttribute("data-report"));
  const textArea = form.querySelector("textarea");
  const message = textArea.value.trim();
  if (!message) {
    alert("Please add a response before sending.");
    return;
  }
  const report = reports.find(r => r.id === id);
  if (report) {
    report.driverResponse = message;
    report.responseNotified = true;
    renderPublicFeed();
    renderModerationQueue();
    renderDriverReports(report.plate);
  }
  textArea.value = "";
}

driverReportsContainer?.addEventListener("submit", handleDriverResponse);

moderationQueue?.addEventListener("click", event => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = Number(button.getAttribute("data-id"));
  const action = button.getAttribute("data-action");
  const report = reports.find(r => r.id === id);

  if (!report) return;
  if (action === "approve") {
    report.status = "published";
  }
  if (action === "remove") {
    const index = reports.findIndex(r => r.id === id);
    reports.splice(index, 1);
  }
  if (action === "edit") {
    const updated = prompt("Edit report text", report.description);
    if (updated !== null) {
      report.description = updated;
      report.reporterComment = updated;
    }
  }
  renderMap();
  renderPublicFeed();
  renderModerationQueue();
});

userTableBody?.addEventListener("click", event => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = Number(button.getAttribute("data-id"));
  const action = button.getAttribute("data-action");
  const user = users.find(u => u.id === id);
  if (!user) return;
  if (action === "promote") {
    const roleSelect = userTableBody.querySelector(`select[data-id='${id}']`);
    user.role = roleSelect.value;
    alert(`${user.name} is now ${user.role}`);
  }
  if (action === "remove") {
    const index = users.findIndex(u => u.id === id);
    users.splice(index, 1);
  }
  renderUsers();
});

visibilityFilter?.addEventListener("change", () => {
  renderMap();
  renderPublicFeed();
});

categoryFilter?.addEventListener("change", () => {
  renderMap();
  renderPublicFeed();
});

renderMap();
renderPublicFeed();
renderModerationQueue();
renderUsers();
