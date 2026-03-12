<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'admin', 60, 60);
$admin = require_role($pdo, 'admin');
require_csrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond_error("Method not allowed", 405);

$input = json_decode(file_get_contents('php://input'), true);
$user_id = (int)($input['user_id'] ?? 0);
if (!$user_id) respond_error("user_id required", 400);
if ($user_id === $admin['id']) respond_error("Cannot ban yourself", 400);

$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$user_id]);
if (!$stmt->fetch()) respond_error("User not found", 404);

$pdo->prepare("UPDATE users SET status = 'banned' WHERE id = ?")->execute([$user_id]);
$pdo->prepare(
    "INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details)
     VALUES (?, 'user_ban', 'user', ?, 'User banned')"
)->execute([$admin['id'], $user_id]);

respond_success(["message" => "User banned"]);
