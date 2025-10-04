<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_active_user();

$setting = $pdo->query("SELECT require_approval FROM settings LIMIT 1")->fetchColumn();
$status = $setting ? "pending" : "approved";

$stmt = $pdo->prepare("
    INSERT INTO reports (user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url, status, timestamp)
    VALUES (?,?,?,?,?,?,?,?,?,NOW())
");
$stmt->execute([
    $_SESSION['user_id'],
    $_POST['category_id'],
    $_POST['severity_id'],
    $_POST['incident_type_id'],
    $_POST['description'],
    $_POST['latitude'],
    $_POST['longitude'],
    $_POST['photo_url'] ?? null,
    $status
]);

respond_success([
    "report_id" => $pdo->lastInsertId(),
    "status" => $status
]);
