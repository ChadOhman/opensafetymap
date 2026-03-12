<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/api_response.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'comment', 10, 300);

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

$report_id = filter_var($input['report_id'] ?? null, FILTER_VALIDATE_INT);
$content = trim($input['content'] ?? '');
$author_name = trim($input['author_name'] ?? '');

// Validate
if (!$report_id) {
    respond_error("Missing or invalid report_id");
}
if ($content === '' || mb_strlen($content) > 2000) {
    respond_error("Content is required and must be under 2000 characters");
}

// Verify report exists and is approved
$report_stmt = $pdo->prepare("SELECT id, status FROM reports WHERE id = ?");
$report_stmt->execute([$report_id]);
$report = $report_stmt->fetch();

if (!$report || $report['status'] !== 'approved') {
    respond_error("Report not found or not available for comments", 404);
}

// Anonymous requires author_name
if (!$user && $author_name === '') {
    respond_error("Author name is required for anonymous comments");
}

// Auto-approve for authenticated users, pending for anonymous
$status = $user ? 'approved' : 'pending';

$stmt = $pdo->prepare("
    INSERT INTO comments (report_id, user_id, author_name, content, status, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
");
$stmt->execute([
    $report_id,
    $user ? $user['id'] : null,
    $user ? null : $author_name,
    $content,
    $status
]);

respond_success([
    'id' => (int)$pdo->lastInsertId(),
    'status' => $status
]);
