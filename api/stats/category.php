<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("user");

$query = "SELECT c.name AS category, COUNT(*) as count
          FROM reports r
          JOIN categories c ON r.category_id = c.id
          WHERE 1=1";
$params = [];

if (!empty($_GET['severity'])) {
    $query .= " AND r.severity_id = (SELECT id FROM severity_levels WHERE name=?)";
    $params[] = $_GET['severity'];
}

if (!empty($_GET['incident_type'])) {
    $query .= " AND r.incident_type_id = (SELECT id FROM incident_types WHERE name=?)";
    $params[] = $_GET['incident_type'];
}

$query .= " GROUP BY c.name";

$stmt = $pdo->prepare($query);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
