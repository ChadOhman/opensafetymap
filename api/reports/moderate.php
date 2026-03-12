<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
$user = require_role($pdo, 'moderator');
require_csrf();
rate_limit($pdo, 'moderate', 60, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond_error("Method not allowed", 405);

$input = json_decode(file_get_contents('php://input'), true);
$report_id = (int)($input['report_id'] ?? 0);
$action = $input['action'] ?? '';
$notes = trim($input['notes'] ?? '');

if (!$report_id) respond_error("report_id required", 400);
if (!in_array($action, ['approve', 'reject', 'resolve'])) {
    respond_error("action must be 'approve', 'reject', or 'resolve'", 400);
}

$stmt = $pdo->prepare("SELECT * FROM reports WHERE id = ?");
$stmt->execute([$report_id]);
$report = $stmt->fetch();
if (!$report) respond_error("Report not found", 404);

$pdo->beginTransaction();
try {
    if ($action === 'approve') {
        $pdo->prepare("UPDATE reports SET status = 'approved' WHERE id = ?")->execute([$report_id]);
    } elseif ($action === 'reject') {
        $pdo->prepare("UPDATE reports SET status = 'rejected' WHERE id = ?")->execute([$report_id]);
    } elseif ($action === 'resolve') {
        $pdo->prepare("UPDATE reports SET resolved_at = NOW() WHERE id = ?")->execute([$report_id]);
    }

    $past = ['approve' => 'approved', 'reject' => 'rejected', 'resolve' => 'resolved'][$action];
    $pdo->prepare(
        "INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details, notes)
         VALUES (?, ?, 'report', ?, ?, ?)"
    )->execute([$user['id'], "report_$action", $report_id, "Report $past", $notes ?: null]);

    $pdo->commit();
    respond_success(["message" => "Report {$action}d"]);
} catch (Exception $e) {
    $pdo->rollBack();
    respond_error("Moderation failed", 500);
}
