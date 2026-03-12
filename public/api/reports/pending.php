<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
$user = require_role($pdo, 'moderator');
rate_limit($pdo, 'moderate', 60, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $per_page;

$total = (int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT r.*, rm.name AS reporter_mode, it.name AS incident_type,
            sl.name AS severity, u.username AS reporter_username
     FROM reports r
     JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
     JOIN incident_types it ON r.incident_type_id = it.id
     JOIN severity_levels sl ON r.severity_id = sl.id
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC
     LIMIT $per_page OFFSET $offset"
);
$stmt->execute();

$reports = $stmt->fetchAll();
foreach ($reports as &$report) {
    $op_stmt = $pdo->prepare(
        "SELECT op.name FROM report_other_parties rop
         JOIN other_parties op ON rop.other_party_id = op.id
         WHERE rop.report_id = ?"
    );
    $op_stmt->execute([$report['id']]);
    $report['other_parties'] = $op_stmt->fetchAll(PDO::FETCH_COLUMN);
}

respond_success([
    'reports' => $reports,
    'page' => $page,
    'total' => $total,
    'total_pages' => (int)ceil($total / $per_page)
]);
