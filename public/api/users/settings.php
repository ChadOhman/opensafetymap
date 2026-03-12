<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'submit', 10, 60);
$user = require_active_user($pdo);
require_csrf();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') respond_error("Method not allowed", 405);

$input = json_decode(file_get_contents('php://input'), true);

$username = trim($input['username'] ?? $user['username']);
$privacy = $input['privacy'] ?? $user['privacy'];

if (!in_array($privacy, ['public', 'logged-in', 'private'])) respond_error("Invalid privacy", 400);
if (strlen($username) < 3 || strlen($username) > 50) respond_error("Username 3-50 chars", 400);

if ($username !== $user['username']) {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
    $stmt->execute([$username, $user['id']]);
    if ($stmt->fetch()) respond_error("Username taken", 409);
}

$pdo->prepare("UPDATE users SET username = ?, privacy = ? WHERE id = ?")
    ->execute([$username, $privacy, $user['id']]);

respond_success(["message" => "Settings updated"]);
