<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond_error("Method not allowed", 405);

$username = $_GET['username'] ?? '';
if (!$username) respond_error("username required", 400);

$stmt = $pdo->prepare("SELECT id, username, name, role, privacy, status, created_at FROM users WHERE username = ?");
$stmt->execute([$username]);
$profile = $stmt->fetch();
if (!$profile || $profile['status'] === 'banned') respond_error("User not found", 404);

$viewer = get_current_user_from_auth($pdo);
$is_owner = $viewer && $viewer['id'] == $profile['id'];
$is_admin = $viewer && ($viewer['role'] === 'admin' || $viewer['role'] === 'moderator');

// Respect privacy settings
if ($profile['privacy'] === 'private' && !$is_owner && !$is_admin) {
    respond_success(['username' => $profile['username'], 'role' => $profile['role']]);
}
if ($profile['privacy'] === 'logged-in' && !$viewer) {
    respond_success(['username' => $profile['username'], 'role' => $profile['role']]);
}

// Full profile - add report count
$count_stmt = $pdo->prepare("SELECT COUNT(*) FROM reports WHERE user_id = ? AND status = 'approved'");
$count_stmt->execute([$profile['id']]);
$profile['report_count'] = (int)$count_stmt->fetchColumn();

respond_success($profile);
