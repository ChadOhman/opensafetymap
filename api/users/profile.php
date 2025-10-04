<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");

$id = $_GET['id'] ?? $_SESSION['user_id'] ?? null;
if (!$id) respond_error("No user specified");

$stmt = $pdo->prepare("SELECT id, username, role, status, privacy FROM users WHERE id=?");
$stmt->execute([$id]);
$user = $stmt->fetch();

if (!$user) respond_error("User not found", 404);

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
