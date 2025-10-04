let users = [];
let currentRole = null;
let currentPage = 1;
const perPage = 10; // users per page
let totalPages = 1;
let filters = { search: "", role: "", status: "" };

async function loadUsers(page = 1) {
  const params = new URLSearchParams({
    page,
    per_page: perPage,
    search: filters.search,
    role: filters.role,
    status: filters.status
  });

  const data = await fetchJSON(`/api/user/list.php?${params.toString()}`);
  users = data.users;
  currentRole = data.current_user_role;
  currentPage = data.page;
  totalPages = data.total_pages;

  renderUsers(users);
  document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${totalPages}`;
}

function renderUsers(data) {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  data.forEach(user => {
    const tr = document.createElement("tr");

    let actions = `<button class="btn-profile" onclick="viewProfile(${user.id})">Profile</button>`;

    if (currentRole === "admin") {
      if (user.status === "active") {
        actions += `<button class="btn-ban" onclick="banUser(${user.id})">Ban</button>`;
      }
      if (user.role !== "admin") {
        actions += `<button class="btn-role" onclick="changeRole(${user.id}, 'moderator')">Make Moderator</button>`;
        actions += `<button class="btn-role" onclick="changeRole(${user.id}, 'user')">Make User</button>`;
      }
    }

    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.oauth_provider}</td>
      <td>${user.role}</td>
      <td>${user.status}</td>
      <td>${user.created_at}</td>
      <td class="actions">${actions}</td>
    `;

    tbody.appendChild(tr);
  });
}

function viewProfile(id) {
  window.location.href = `/user_profile.html?id=${id}`;
}

async function banUser(id) {
  await fetchJSON("/api/user/ban.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: id })
  });
  alert("User banned.");
  loadUsers(currentPage);
}

async function changeRole(id, role) {
  await fetchJSON("/api/admin/promote.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: id, role })
  });
  alert("User role updated.");
  loadUsers(currentPage);
}

document.getElementById("searchBox").addEventListener("input", function () {
  filters.search = this.value;
  loadUsers(1);
});

function applyFilters() {
  filters.role = document.getElementById("roleFilter").value;
  filters.status = document.getElementById("statusFilter").value;
  loadUsers(1);
}

function prevPage() {
  if (currentPage > 1) loadUsers(currentPage - 1);
}

function nextPage() {
  if (currentPage < totalPages) loadUsers(currentPage + 1);
}

// Init
loadUsers();
