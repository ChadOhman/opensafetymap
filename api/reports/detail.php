<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/api_response.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'public_read', 120, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error("Method not allowed", 405);
}

$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if (!$id) {
    respond_error("Missing or invalid report id");
}

// Role-based visibility
$user = get_current_user_from_auth($pdo);
$is_mod = $user && in_array($user['role'], ['moderator', 'admin']);

$status_clause = $is_mod ? "" : "AND r.status = 'approved'";

// Fetch report — explicit columns, NO reporter_email or reporter_phone
$sql = "SELECT r.id, r.description, r.latitude, r.longitude, r.incident_date,
               r.created_at, r.status, r.video_url,
               rm.name AS reporter_mode,
               it.name AS incident_type,
               sl.name AS severity,
               u.username
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
        JOIN incident_types it ON r.incident_type_id = it.id
        JOIN severity_levels sl ON r.severity_id = sl.id
        WHERE r.id = ? $status_clause";

$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);
$report = $stmt->fetch();

if (!$report) {
    respond_error("Report not found", 404);
}

// Fetch photos
$photos_stmt = $pdo->prepare(
    "SELECT id, url, sort_order FROM report_photos WHERE report_id = ? ORDER BY sort_order"
);
$photos_stmt->execute([$id]);
$report['photos'] = $photos_stmt->fetchAll();

// Fetch other parties
$parties_stmt = $pdo->prepare(
    "SELECT op.id, op.name
     FROM report_other_parties rop
     JOIN other_parties op ON op.id = rop.other_party_id
     WHERE rop.report_id = ?
     ORDER BY op.id"
);
$parties_stmt->execute([$id]);
$report['other_parties'] = $parties_stmt->fetchAll();

// Fetch approved comments
$comment_status = $is_mod ? "" : "AND c.status = 'approved'";
$comments_stmt = $pdo->prepare(
    "SELECT c.id, c.content, c.author_name, c.created_at, u.username
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.report_id = ? $comment_status
     ORDER BY c.created_at ASC"
);
$comments_stmt->execute([$id]);
$report['comments'] = $comments_stmt->fetchAll();

respond_success($report);
