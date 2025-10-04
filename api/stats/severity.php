<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("user");

$query = "SELECT s.name AS severity, COUNT(*) as count
          FROM reports r
          JOIN severity_levels s ON r.severity_id = s.id
          WHERE 1=1";
$params = [];

if (!empty($_GET['category'])) {
    $query .= " AND r.category_id = (SELECT id FROM categories WHERE name=?)";
    $params[] = $_GET['category'];
}
if (!empty($_GET['incident_type'])) {
    $query .= " AND r.incident_type_id = (SELECT id FROM incident_types WHERE name=?)";
    $params[] = $_GET['incident_type'];
}

$query .= " GROUP BY s.name";

$stmt = $pdo->prepare($query);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
