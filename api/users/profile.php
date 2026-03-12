<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");

$id = $_GET['id'] ?? $_SESSION['user_id'] ?? null;
if (!$id) respond_error("No user specified");

$stmt = $pdo->prepare("SELECT id, username, role, status, privacy FROM users WHERE id=?");
$stmt->execute([$id]);
$user = $stmt->fetch();

if (!$user) respond_error("User not found", 404);

// Check privacy settings
$isOwner = isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user['id'];
$isAdmin = ($_SESSION['role'] ?? '') === 'admin';
$canSeeDetails = $isOwner || $isAdmin ||
    ($user['privacy'] === 'public') ||
    ($user['privacy'] === 'logged-in' && isset($_SESSION['user_id']));

if (!$canSeeDetails) {
    respond_success([
        "user" => ["id" => $user['id'], "username" => $user['username'], "role" => $user['role']],
        "reports" => [],
        "comments" => []
    ]);
}

// Reports
$reports = $pdo->prepare("SELECT id, description, status, timestamp FROM reports WHERE user_id=? ORDER BY timestamp DESC");
$reports->execute([$id]);

// Comments
$comments = $pdo->prepare("SELECT id, content, timestamp FROM comments WHERE user_id=? ORDER BY timestamp DESC");
$comments->execute([$id]);

respond_success([
    "user" => $user,
    "reports" => $reports->fetchAll(),
    "comments" => $comments->fetchAll()
]);
