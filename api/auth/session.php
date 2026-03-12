<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error("Method not allowed", 405);
}

$user = get_current_user_from_auth($pdo);
if (!$user) {
    respond_error("Not authenticated", 401);
}

respond_success([
    'id' => $user['id'],
    'username' => $user['username'],
    'name' => $user['name'],
    'email' => $user['email'],
    'role' => $user['role'],
    'status' => $user['status'],
    'privacy' => $user['privacy']
]);
