<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("user");

$query = "SELECT it.name AS incident_type, COUNT(*) as count
          FROM reports r
          JOIN incident_types it ON r.incident_type_id = it.id
          WHERE 1=1";
$params = [];

if (!empty($_GET['category'])) {
    $query .= " AND r.category_id = (SELECT id FROM categories WHERE name=?)";
    $params[] = $_GET['category'];
}
if (!empty($_GET['severity'])) {
    $query .= " AND r.severity_id = (SELECT id FROM severity_levels WHERE name=?)";
    $params[] = $_GET['severity'];
}

$query .= " GROUP BY it.name";

$stmt = $pdo->prepare($query);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
