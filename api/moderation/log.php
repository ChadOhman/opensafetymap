<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
require_role($pdo, 'moderator');
rate_limit($pdo, 'moderate', 60, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$where = [];
$params = [];

if (!empty($_GET['action_type'])) {
    $where[] = "ml.action_type = ?";
    $params[] = $_GET['action_type'];
}
if (!empty($_GET['target_type'])) {
    $where[] = "ml.target_type = ?";
    $params[] = $_GET['target_type'];
}
if (!empty($_GET['date_from'])) {
    $where[] = "ml.created_at >= ?";
    $params[] = $_GET['date_from'];
}
if (!empty($_GET['date_to'])) {
    $where[] = "ml.created_at <= ?";
    $params[] = $_GET['date_to'];
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT ml.*, u.username AS moderator_name
        FROM moderation_log ml
        JOIN users u ON ml.moderator_id = u.id
        $where_sql
        ORDER BY ml.created_at DESC
        LIMIT 200";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
respond_success($stmt->fetchAll());
