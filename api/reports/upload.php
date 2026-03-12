<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/api_response.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'upload', 10, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error("Method not allowed", 405);
}

// Auth or honeypot
$user = get_current_user_from_auth($pdo);
if ($user) {
    if (get_auth_method() === 'session') {
        require_csrf();
    }
} else {
    check_honeypot();
}

// Validate file upload
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    respond_error("No file uploaded or upload error");
}

$file = $_FILES['file'];

// Validate file type using finfo (not user-supplied MIME)
$allowed_image_types = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

$allowed_video_types = [
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$is_image = isset($allowed_image_types[$mime]);
$is_video = isset($allowed_video_types[$mime]);

if (!$is_image && !$is_video) {
    respond_error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime.");
}

// Determine upload type, extension, max size, and filename prefix
if ($is_image) {
    $ext = $allowed_image_types[$mime];
    $max_size = 10 * 1024 * 1024; // 10 MB
    $upload_type = 'photo';
    $prefix = 'photo_';
    $size_label = '10 MB';
} else {
    $ext = $allowed_video_types[$mime];
    $max_size = 100 * 1024 * 1024; // 100 MB
    $upload_type = 'video';
    $prefix = 'video_';
    $size_label = '100 MB';
}

if ($file['size'] > $max_size) {
    respond_error("File too large. Maximum size is $size_label.");
}

// Create upload directory if needed
$upload_dir = __DIR__ . '/../../uploads/pending';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Server-controlled filename
$filename = $prefix . bin2hex(random_bytes(16)) . '.' . $ext;
$dest = $upload_dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    respond_error("Failed to save uploaded file", 500);
}

// Reuse existing upload_token if provided, otherwise create a new one
$provided_token = $_GET['upload_token'] ?? null;

if ($provided_token) {
    // Look up existing token
    $tok_stmt = $pdo->prepare(
        "SELECT token FROM upload_tokens WHERE token = ? AND expires_at > NOW()"
    );
    $tok_stmt->execute([$provided_token]);
    if ($tok_stmt->fetch()) {
        $token = $provided_token;
    } else {
        respond_error("Invalid or expired upload token", 400);
    }
} else {
    // Create DB-backed upload token
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $stmt = $pdo->prepare(
        "INSERT INTO upload_tokens (token, user_id, expires_at) VALUES (?, ?, ?)"
    );
    $stmt->execute([$token, $user ? $user['id'] : null, $expires]);
}

$url = '/uploads/pending/' . $filename;

respond_success([
    'url' => $url,
    'upload_token' => $token,
    'filename' => $filename,
    'type' => $upload_type
]);
