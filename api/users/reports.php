<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'submit', 30, 60);
$user = require_active_user($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $per_page;

$stmt = $pdo->prepare("SELECT COUNT(*) FROM reports WHERE user_id = ?");
$stmt->execute([$user['id']]);
$total = (int)$stmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT r.*, rm.name AS reporter_mode, it.name AS incident_type, sl.name AS severity
     FROM reports r
     JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
     JOIN incident_types it ON r.incident_type_id = it.id
     JOIN severity_levels sl ON r.severity_id = sl.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC LIMIT $per_page OFFSET $offset"
);
$stmt->execute([$user['id']]);

respond_success([
    'reports' => $stmt->fetchAll(),
    'page' => $page,
    'total' => $total,
    'total_pages' => (int)ceil($total / $per_page)
]);
