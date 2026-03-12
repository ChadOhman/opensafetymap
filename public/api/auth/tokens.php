<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');

set_cors_headers();
$user = require_active_user($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        "SELECT id, device_name, created_at, expires_at
         FROM auth_tokens WHERE user_id = ? AND expires_at > NOW()
         ORDER BY created_at DESC"
    );
    $stmt->execute([$user['id']]);
    respond_success($stmt->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    require_csrf();
    $token_id = $_GET['id'] ?? null;
    if (!$token_id) respond_error("Token ID required", 400);

    $stmt = $pdo->prepare("DELETE FROM auth_tokens WHERE id = ? AND user_id = ?");
    $stmt->execute([(int)$token_id, $user['id']]);
    respond_success(["message" => "Token revoked"]);
}

respond_error("Method not allowed", 405);
