<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/api_response.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'submit', 10, 60);

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
$max_size = 10 * 1024 * 1024; // 10 MB
if ($file['size'] > $max_size) {
    respond_error("File too large. Maximum size is 10 MB.");
}

// Validate file type using finfo (not user-supplied MIME)
$allowed_types = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!isset($allowed_types[$mime])) {
    respond_error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP.");
}

$ext = $allowed_types[$mime];

// Create upload directory if needed
$upload_dir = __DIR__ . '/../../uploads/pending';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Server-controlled filename
$filename = bin2hex(random_bytes(16)) . '.' . $ext;
$dest = $upload_dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    respond_error("Failed to save uploaded file", 500);
}

// Create DB-backed upload token
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
$stmt = $pdo->prepare(
    "INSERT INTO upload_tokens (token, user_id, expires_at) VALUES (?, ?, ?)"
);
$stmt->execute([$token, $user ? $user['id'] : null, $expires]);

$url = '/uploads/pending/' . $filename;

respond_success([
    'url' => $url,
    'upload_token' => $token,
    'filename' => $filename
]);
