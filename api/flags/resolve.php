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
$flag_id = (int)($input['flag_id'] ?? 0);
$action = $input['action'] ?? '';
$notes = trim($input['notes'] ?? '');

if (!$flag_id) respond_error("flag_id required", 400);
if (!in_array($action, ['dismiss', 'remove'])) respond_error("action must be 'dismiss' or 'remove'", 400);

$stmt = $pdo->prepare("SELECT * FROM flags WHERE id = ?");
$stmt->execute([$flag_id]);
$flag = $stmt->fetch();
if (!$flag) respond_error("Flag not found", 404);

$pdo->beginTransaction();
try {
    $new_status = $action === 'dismiss' ? 'dismissed' : 'removed';
    $pdo->prepare("UPDATE flags SET status = ? WHERE id = ?")->execute([$new_status, $flag_id]);

    if ($action === 'remove') {
        if ($flag['target_type'] === 'report') {
            $pdo->prepare("UPDATE reports SET status = 'rejected' WHERE id = ?")->execute([$flag['target_id']]);
        } else {
            $pdo->prepare("DELETE FROM comments WHERE id = ?")->execute([$flag['target_id']]);
        }
    }

    $past = $action === 'dismiss' ? 'dismissed' : 'removed';
    $pdo->prepare(
        "INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details, notes)
         VALUES (?, ?, ?, ?, ?, ?)"
    )->execute([$user['id'], "flag_$action", $flag['target_type'], $flag['target_id'], "Flag $flag_id $past", $notes ?: null]);

    $pdo->commit();
    respond_success(["message" => "Flag {$action}ed"]);
} catch (Exception $e) {
    $pdo->rollBack();
    respond_error("Failed to resolve flag", 500);
}
