<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/api_response.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'flag', 5, 600);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error("Method not allowed", 405);
}

// Auth or anonymous
$user = get_current_user_from_auth($pdo);
if ($user) {
    if (get_auth_method() === 'session') {
        require_csrf();
    }
} else {
    check_honeypot();
}

// Parse input
$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
}

$target_type = $input['target_type'] ?? '';
$target_id = filter_var($input['target_id'] ?? null, FILTER_VALIDATE_INT);
$reason = trim($input['reason'] ?? '');

// Validate target_type
if (!in_array($target_type, ['report', 'comment'], true)) {
    respond_error("target_type must be 'report' or 'comment'");
}

if (!$target_id) {
    respond_error("Missing or invalid target_id");
}

if ($reason === '' || mb_strlen($reason) > 1000) {
    respond_error("Reason is required and must be under 1000 characters");
}

// Validate target exists
if ($target_type === 'report') {
    $check = $pdo->prepare("SELECT id FROM reports WHERE id = ?");
} else {
    $check = $pdo->prepare("SELECT id FROM comments WHERE id = ?");
}
$check->execute([$target_id]);
if (!$check->fetch()) {
    respond_error("Target not found", 404);
}

$stmt = $pdo->prepare("
    INSERT INTO flags (user_id, target_type, target_id, reason, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', NOW())
");
$stmt->execute([
    $user ? $user['id'] : null,
    $target_type,
    $target_id,
    $reason
]);

respond_success([
    'id' => (int)$pdo->lastInsertId()
]);
