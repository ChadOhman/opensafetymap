<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");

$role = $_SESSION['role'] ?? "guest";

$query = "SELECT r.id, r.description, r.latitude, r.longitude, r.timestamp, r.photo_url, r.status,
                 u.username, c.name AS category, s.name AS severity, i.name AS incident_type
          FROM reports r
          JOIN users u ON r.user_id=u.id
          JOIN categories c ON r.category_id=c.id
          JOIN severity_levels s ON r.severity_id=s.id
          JOIN incident_types i ON r.incident_type_id=i.id";

if (!in_array($role, ["moderator", "admin"])) {
    $query .= " WHERE r.status='approved'";
}

$stmt = $pdo->query($query);
respond_success($stmt->fetchAll());
