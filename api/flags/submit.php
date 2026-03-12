<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");
require_once("../../db/rate_limiter.php");

require_active_user();
require_csrf();
rate_limit('flag', 10, 60);

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['reason'])) respond_error("Missing reason");

$target_type = isset($data['report_id']) ? 'report' : (isset($data['comment_id']) ? 'comment' : null);
$target_id = $data['report_id'] ?? $data['comment_id'] ?? null;
if (!$target_type || !$target_id) respond_error("Missing report_id or comment_id");

$stmt = $pdo->prepare("INSERT INTO flags (user_id, target_type, target_id, reason, status, timestamp)
                       VALUES (?,?,?,?, 'pending', NOW())");
$stmt->execute([
    $_SESSION['user_id'],
    $target_type,
    $target_id,
    $data['reason']
]);

respond_success(["flag_id" => $pdo->lastInsertId()]);
