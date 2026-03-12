<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/api_response.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'public_read', 120, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error("Method not allowed", 405);
}

// bbox is required: lat1,lng1,lat2,lng2
$bbox = $_GET['bbox'] ?? '';
$parts = explode(',', $bbox);
if (count($parts) !== 4) {
    respond_error("bbox parameter required (lat1,lng1,lat2,lng2)");
}

$lat1_raw = (float)$parts[0];
$lng1_raw = (float)$parts[1];
$lat2_raw = (float)$parts[2];
$lng2_raw = (float)$parts[3];

$lat1 = min($lat1_raw, $lat2_raw);
$lat2 = max($lat1_raw, $lat2_raw);
$lng1 = min($lng1_raw, $lng2_raw);
$lng2 = max($lng1_raw, $lng2_raw);

if ($lat1 < -90 || $lat1 > 90 || $lat2 < -90 || $lat2 > 90) {
    respond_error("Invalid latitude in bbox");
}
if ($lng1 < -180 || $lng1 > 180 || $lng2 < -180 || $lng2 > 180) {
    respond_error("Invalid longitude in bbox");
}

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $per_page;

// Role-based visibility
$user = get_current_user_from_auth($pdo);
$is_mod = $user && in_array($user['role'], ['moderator', 'admin']);

// Build WHERE conditions
$conditions = [
    "r.latitude BETWEEN :lat1 AND :lat2",
    "r.longitude BETWEEN :lng1 AND :lng2"
];
$params = [
    ':lat1' => $lat1,
    ':lng1' => $lng1,
    ':lat2' => $lat2,
    ':lng2' => $lng2
];

if (!$is_mod) {
    $conditions[] = "r.status = 'approved'";
}

// Optional filters
if (!empty($_GET['reporter_mode'])) {
    $conditions[] = "r.reporter_mode_id = :reporter_mode";
    $params[':reporter_mode'] = (int)$_GET['reporter_mode'];
}
if (!empty($_GET['incident_type'])) {
    $conditions[] = "r.incident_type_id = :incident_type";
    $params[':incident_type'] = (int)$_GET['incident_type'];
}
if (!empty($_GET['severity'])) {
    $conditions[] = "r.severity_id = :severity";
    $params[':severity'] = (int)$_GET['severity'];
}
if (!empty($_GET['date_from'])) {
    $conditions[] = "r.incident_date >= :date_from";
    $params[':date_from'] = $_GET['date_from'];
}
if (!empty($_GET['date_to'])) {
    $conditions[] = "r.incident_date <= :date_to";
    $params[':date_to'] = $_GET['date_to'];
}

// other_party filter requires a join
$other_party_join = '';
if (!empty($_GET['other_party'])) {
    $other_party_join = "JOIN report_other_parties rop ON rop.report_id = r.id
                         JOIN other_parties op_filter ON op_filter.id = rop.other_party_id";
    $conditions[] = "rop.other_party_id = :other_party";
    $params[':other_party'] = (int)$_GET['other_party'];
}

$where = implode(' AND ', $conditions);

// Count total (use DISTINCT because of potential junction join)
$count_sql = "SELECT COUNT(DISTINCT r.id)
              FROM reports r
              $other_party_join
              WHERE $where";
$count_stmt = $pdo->prepare($count_sql);
$count_stmt->execute($params);
$total = (int)$count_stmt->fetchColumn();

// Fetch reports
$sql = "SELECT r.id, r.description, r.latitude, r.longitude, r.incident_date, r.created_at,
               r.resolved_at, r.status, r.video_url,
               rm.name AS reporter_mode,
               it.name AS incident_type,
               sl.name AS severity,
               u.username AS reporter_username,
               (SELECT COUNT(*) FROM report_photos rp WHERE rp.report_id = r.id) AS photo_count,
               (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id AND c.status = 'approved') AS comment_count
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
        JOIN incident_types it ON r.incident_type_id = it.id
        JOIN severity_levels sl ON r.severity_id = sl.id
        $other_party_join
        WHERE $where
        GROUP BY r.id
        ORDER BY r.created_at DESC
        LIMIT $per_page OFFSET $offset";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$reports = $stmt->fetchAll();

respond_success([
    'reports' => $reports,
    'page' => $page,
    'per_page' => $per_page,
    'total' => $total,
    'total_pages' => max(1, (int)ceil($total / $per_page))
]);
