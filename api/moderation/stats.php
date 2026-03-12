<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
require_role($pdo, 'moderator');
rate_limit($pdo, 'moderate', 60, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$total = (int)$pdo->query("SELECT COUNT(*) FROM reports")->fetchColumn();
$approved = (int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status='approved'")->fetchColumn();
$rejected = (int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status='rejected'")->fetchColumn();
$pending = (int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status='pending'")->fetchColumn();

$avg_stmt = $pdo->query(
    "SELECT AVG(TIMESTAMPDIFF(HOUR, r.created_at, ml.created_at)) as avg_hours
     FROM moderation_log ml
     JOIN reports r ON ml.target_id = r.id AND ml.target_type = 'report'
     WHERE ml.action_type IN ('report_approve', 'report_reject')"
);
$avg_hours = round((float)($avg_stmt->fetchColumn() ?: 0), 1);

$trend = $pdo->query(
    "SELECT DATE_FORMAT(created_at, '%Y-%u') as week,
            SUM(action_type = 'report_approve') as approved,
            SUM(action_type = 'report_reject') as rejected
     FROM moderation_log
     WHERE target_type = 'report' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY week ORDER BY week"
)->fetchAll();

respond_success([
    'total' => $total, 'approved' => $approved,
    'rejected' => $rejected, 'pending' => $pending,
    'avg_resolution_hours' => $avg_hours,
    'weekly_trend' => $trend
]);
