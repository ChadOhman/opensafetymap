<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");

require_role("user");

$query = "SELECT r.id, r.description, r.latitude, r.longitude, r.timestamp, r.photo_url,
                 u.name, c.name AS category, s.name AS severity, i.name AS incident_type
          FROM reports r
          JOIN users u ON r.user_id=u.id
          JOIN categories c ON r.category_id=c.id
          JOIN severity_levels s ON r.severity_id=s.id
          JOIN incident_types i ON r.incident_type_id=i.id
          WHERE 1=1";
$params = [];

if (!empty($_GET['category'])) {
    $query .= " AND c.name=?";
    $params[] = $_GET['category'];
}
if (!empty($_GET['severity'])) {
    $query .= " AND s.name=?";
    $params[] = $_GET['severity'];
}
if (!empty($_GET['incident_type'])) {
    $query .= " AND i.name=?";
    $params[] = $_GET['incident_type'];
}

$stmt = $pdo->prepare($query);
$stmt->execute($params);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
