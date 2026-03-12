<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/api_response.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'submit', 5, 600);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error("Method not allowed", 405);
}

// Auth: supports logged-in users and anonymous
$user = get_current_user_from_auth($pdo);
if ($user) {
    // Session-based auth requires CSRF
    if (get_auth_method() === 'session') {
        require_csrf();
    }
} else {
    // Anonymous — check honeypot
    check_honeypot();
}

// Parse input (supports form data and JSON)
$input = $_POST;
if (empty($input)) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
}

// Required fields
$reporter_mode_id = filter_var($input['reporter_mode_id'] ?? null, FILTER_VALIDATE_INT);
$incident_type_id = filter_var($input['incident_type_id'] ?? null, FILTER_VALIDATE_INT);
$severity_id = filter_var($input['severity_id'] ?? null, FILTER_VALIDATE_INT);
$description = trim($input['description'] ?? '');
$latitude = filter_var($input['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($input['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

// Optional fields
$incident_date = $input['incident_date'] ?? null;
$video_url = trim($input['video_url'] ?? '');
$reporter_email = trim($input['reporter_email'] ?? '');
$reporter_phone = trim($input['reporter_phone'] ?? '');
$other_party_ids = $input['other_party_ids'] ?? [];
$photo_urls = $input['photo_urls'] ?? [];
$upload_token = $input['upload_token'] ?? null;

// Validate required fields
if (!$reporter_mode_id) respond_error("Invalid reporter mode");
if (!$incident_type_id) respond_error("Invalid incident type");
if (!$severity_id) respond_error("Invalid severity level");
if ($description === '' || mb_strlen($description) > 2000) {
    respond_error("Description is required and must be under 2000 characters");
}
if ($latitude === false || $latitude < -90 || $latitude > 90) respond_error("Invalid latitude");
if ($longitude === false || $longitude < -180 || $longitude > 180) respond_error("Invalid longitude");

// Validate lookups exist
$rm = $pdo->prepare("SELECT id FROM reporter_modes WHERE id = ?");
$rm->execute([$reporter_mode_id]);
if (!$rm->fetch()) respond_error("Invalid reporter mode");

$it = $pdo->prepare("SELECT id FROM incident_types WHERE id = ?");
$it->execute([$incident_type_id]);
if (!$it->fetch()) respond_error("Invalid incident type");

$sv = $pdo->prepare("SELECT id FROM severity_levels WHERE id = ?");
$sv->execute([$severity_id]);
if (!$sv->fetch()) respond_error("Invalid severity level");

// Validate incident_date if provided
if ($incident_date !== null && $incident_date !== '') {
    $dt = \DateTime::createFromFormat('Y-m-d\TH:i', $incident_date)
        ?: \DateTime::createFromFormat('Y-m-d H:i:s', $incident_date)
        ?: \DateTime::createFromFormat('Y-m-d', $incident_date);
    if (!$dt) respond_error("Invalid incident date format");
    $incident_date = $dt->format('Y-m-d H:i:s');
} else {
    $incident_date = null;
}

// Validate video URL if provided
if ($video_url && !preg_match('#^/uploads/pending/video_[a-f0-9]+\.(mp4|webm|mov)$#i', $video_url)) {
    respond_error("Invalid video URL", 400);
}
if ($video_url === '') $video_url = null;

// Validate other_party_ids
if (!is_array($other_party_ids)) {
    $other_party_ids = [];
}
if (!empty($other_party_ids)) {
    $placeholders = implode(',', array_fill(0, count($other_party_ids), '?'));
    $check = $pdo->prepare("SELECT COUNT(*) FROM other_parties WHERE id IN ($placeholders)");
    $check->execute(array_map('intval', $other_party_ids));
    if ((int)$check->fetchColumn() !== count($other_party_ids)) {
        respond_error("One or more invalid other party IDs");
    }
}

// Validate photo count
if (is_array($photo_urls) && count($photo_urls) > 10) {
    respond_error("Maximum 10 photos", 400);
}

// Validate upload_token if photos/video provided
if (!empty($photo_urls) || $video_url !== null) {
    if (!$upload_token) {
        respond_error("Upload token required when providing photos or video");
    }
    $tok_stmt = $pdo->prepare(
        "SELECT token FROM upload_tokens WHERE token = ? AND expires_at > NOW()"
    );
    $tok_stmt->execute([$upload_token]);
    if (!$tok_stmt->fetch()) {
        respond_error("Invalid or expired upload token");
    }

    // Validate photo URLs are from our server
    if (!empty($photo_urls) && is_array($photo_urls)) {
        foreach ($photo_urls as $url) {
            if (!is_string($url) || !preg_match('#^/uploads/pending/.+$#', $url)) {
                respond_error("Invalid photo URL: must be a server upload path");
            }
        }
    }
}

// Anonymous submissions require email or phone
if (!$user) {
    if ($reporter_email === '' && $reporter_phone === '') {
        respond_error("Anonymous reports require an email or phone number");
    }
    if ($reporter_email !== '' && !filter_var($reporter_email, FILTER_VALIDATE_EMAIL)) {
        respond_error("Invalid email address");
    }
}

// Sanitize contact for authenticated users (not stored)
if ($user) {
    $reporter_email = null;
    $reporter_phone = null;
} else {
    $reporter_email = $reporter_email ?: null;
    $reporter_phone = $reporter_phone ?: null;
}

// Insert report in a transaction
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("
        INSERT INTO reports (user_id, reporter_mode_id, incident_type_id, severity_id,
                             description, incident_date, latitude, longitude,
                             video_url, reporter_email, reporter_phone, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->execute([
        $user ? $user['id'] : null,
        $reporter_mode_id,
        $incident_type_id,
        $severity_id,
        $description,
        $incident_date,
        $latitude,
        $longitude,
        $video_url,
        $reporter_email,
        $reporter_phone
    ]);
    $report_id = (int)$pdo->lastInsertId();

    // Insert junction rows for other parties
    if (!empty($other_party_ids)) {
        $party_stmt = $pdo->prepare(
            "INSERT INTO report_other_parties (report_id, other_party_id) VALUES (?, ?)"
        );
        foreach ($other_party_ids as $party_id) {
            $party_stmt->execute([$report_id, (int)$party_id]);
        }
    }

    // Insert photo records
    if (!empty($photo_urls) && is_array($photo_urls)) {
        $photo_stmt = $pdo->prepare(
            "INSERT INTO report_photos (report_id, url, sort_order) VALUES (?, ?, ?)"
        );
        $sort = 0;
        foreach ($photo_urls as $url) {
            $photo_stmt->execute([$report_id, $url, $sort]);
            $sort++;
        }
    }

    // Clean up used upload token
    if ($upload_token) {
        $pdo->prepare("DELETE FROM upload_tokens WHERE token = ?")->execute([$upload_token]);
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Report submit error: " . $e->getMessage());
    respond_error("Failed to submit report", 500);
}

respond_success([
    'id' => $report_id,
    'status' => 'pending'
]);
