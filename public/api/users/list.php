<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'admin', 60, 60);
require_role($pdo, 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $per_page;

$where = [];
$params = [];

if (!empty($_GET['search'])) {
    $search = '%' . $_GET['search'] . '%';
    $where[] = "(username LIKE ? OR name LIKE ? OR email LIKE ?)";
    $params[] = $search;
    $params[] = $search;
    $params[] = $search;
}
if (!empty($_GET['role'])) {
    $where[] = "role = ?";
    $params[] = $_GET['role'];
}
if (!empty($_GET['status'])) {
    $where[] = "status = ?";
    $params[] = $_GET['status'];
}

$where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$count_stmt = $pdo->prepare("SELECT COUNT(*) FROM users $where_sql");
$count_stmt->execute($params);
$total = (int)$count_stmt->fetchColumn();

$sql = "SELECT id, username, name, email, role, status, privacy, created_at FROM users $where_sql ORDER BY created_at DESC LIMIT $per_page OFFSET $offset";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

respond_success([
    'users' => $stmt->fetchAll(),
    'page' => $page,
    'total' => $total,
    'total_pages' => (int)ceil($total / $per_page)
]);
