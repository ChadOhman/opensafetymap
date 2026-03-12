<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");

$role = $_SESSION['role'] ?? "guest";

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $perPage;

$whereClause = "";
if (!in_array($role, ["moderator", "admin"])) {
    $whereClause = " WHERE r.status='approved'";
}

// Count total
$countStmt = $pdo->query("SELECT COUNT(*) FROM reports r" . $whereClause);
$total = (int)$countStmt->fetchColumn();

$query = "SELECT r.id, r.description, r.latitude, r.longitude, r.timestamp, r.photo_url, r.status,
                 u.username, c.name AS category, s.name AS severity, i.name AS incident_type
          FROM reports r
          JOIN users u ON r.user_id=u.id
          JOIN categories c ON r.category_id=c.id
          JOIN severity_levels s ON r.severity_id=s.id
          JOIN incident_types i ON r.incident_type_id=i.id"
    . $whereClause
    . " ORDER BY r.timestamp DESC LIMIT $perPage OFFSET $offset";

$stmt = $pdo->query($query);
respond_success([
    "reports" => $stmt->fetchAll(),
    "page" => $page,
    "per_page" => $perPage,
    "total" => $total,
    "total_pages" => max(1, (int)ceil($total / $perPage))
]);
