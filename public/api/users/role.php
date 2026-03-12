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
$role = $input['role'] ?? '';

if (!$user_id) respond_error("user_id required", 400);
if (!in_array($role, ['user', 'moderator', 'admin'])) respond_error("Invalid role", 400);
if ($user_id === $admin['id']) respond_error("Cannot change own role", 400);

$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$user_id]);
if (!$stmt->fetch()) respond_error("User not found", 404);

$pdo->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$role, $user_id]);
$pdo->prepare(
    "INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details)
     VALUES (?, 'role_change', 'user', ?, ?)"
)->execute([$admin['id'], $user_id, "Role changed to $role"]);

respond_success(["message" => "Role updated"]);
