<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");
require_once("../../db/rate_limiter.php");

require_active_user();
require_csrf();
rate_limit('submit', 10, 60);

// Validate inputs
$category_id = filter_var($_POST['category_id'] ?? null, FILTER_VALIDATE_INT);
$severity_id = filter_var($_POST['severity_id'] ?? null, FILTER_VALIDATE_INT);
$incident_type_id = filter_var($_POST['incident_type_id'] ?? null, FILTER_VALIDATE_INT);
$description = trim($_POST['description'] ?? '');
$latitude = filter_var($_POST['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($_POST['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
$photo_url = $_POST['photo_url'] ?? null;

if (!$category_id || !in_array($category_id, [1, 2, 3])) respond_error("Invalid category");
if (!$severity_id || !in_array($severity_id, [1, 2, 3])) respond_error("Invalid severity");
if (!$incident_type_id || !in_array($incident_type_id, [1, 2])) respond_error("Invalid incident type");
if ($description === '' || mb_strlen($description) > 2000) respond_error("Description is required and must be under 2000 characters");
if ($latitude === false || $latitude < -90 || $latitude > 90) respond_error("Invalid latitude");
if ($longitude === false || $longitude < -180 || $longitude > 180) respond_error("Invalid longitude");
if ($photo_url !== null && $photo_url !== '' && !filter_var($photo_url, FILTER_VALIDATE_URL)) respond_error("Invalid photo URL");
if ($photo_url === '') $photo_url = null;

$setting = $pdo->query("SELECT require_approval FROM settings LIMIT 1")->fetchColumn();
$status = $setting ? "pending" : "approved";

$stmt = $pdo->prepare("
    INSERT INTO reports (user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url, status, timestamp)
    VALUES (?,?,?,?,?,?,?,?,?,NOW())
");
$stmt->execute([
    $_SESSION['user_id'],
    $category_id,
    $severity_id,
    $incident_type_id,
    $description,
    $latitude,
    $longitude,
    $photo_url,
    $status
]);

respond_success([
    "report_id" => $pdo->lastInsertId(),
    "status" => $status
]);
