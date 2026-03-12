<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
require_role($pdo, 'moderator');
rate_limit($pdo, 'moderate', 60, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $per_page;

$status_filter = $_GET['status'] ?? 'pending';

$count_stmt = $pdo->prepare("SELECT COUNT(*) FROM flags WHERE status = ?");
$count_stmt->execute([$status_filter]);
$total = (int)$count_stmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT f.*, u.username AS flagged_by
     FROM flags f
     LEFT JOIN users u ON f.user_id = u.id
     WHERE f.status = ?
     ORDER BY f.created_at DESC
     LIMIT $per_page OFFSET $offset"
);
$stmt->execute([$status_filter]);
$flags = $stmt->fetchAll();

foreach ($flags as &$flag) {
    if ($flag['target_type'] === 'report') {
        $stmt = $pdo->prepare("SELECT description, status FROM reports WHERE id = ?");
        $stmt->execute([$flag['target_id']]);
        $flag['target'] = $stmt->fetch() ?: ['description' => '[deleted]', 'status' => 'unknown'];
    } else {
        $stmt = $pdo->prepare("SELECT content, status FROM comments WHERE id = ?");
        $stmt->execute([$flag['target_id']]);
        $flag['target'] = $stmt->fetch() ?: ['content' => '[deleted]', 'status' => 'unknown'];
    }
}

respond_success([
    'flags' => $flags,
    'page' => $page,
    'total' => $total,
    'total_pages' => (int)ceil($total / $per_page)
]);
