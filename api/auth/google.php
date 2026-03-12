<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');
require_once(__DIR__ . '/../../db/rate_limiter.php');
require_once(__DIR__ . '/oauth_helper.php');

set_cors_headers();
rate_limit($pdo, 'auth', 10, 600);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error("Method not allowed", 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$id_token = $input['id_token'] ?? null;
if (!$id_token) {
    respond_error("id_token required", 400);
}

$config = require(__DIR__ . '/../../db/oauth_config.php');
try {
    $verified = verify_oauth_token('google', $id_token, $config['google']);
    $result = handle_oauth_login('google', $verified['oauth_id'], $verified['name'], $verified['email'], $pdo);
    respond_success($result);
} catch (Exception $e) {
    respond_error("Authentication failed: " . $e->getMessage(), 401);
}
