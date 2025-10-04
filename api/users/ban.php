<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("admin");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing user_id"]);
    exit;
}

$stmt = $pdo->prepare("UPDATE users SET status='banned' WHERE id=?");
$stmt->execute([$data['user_id']]);

// Log ban
$logStmt = $pdo->prepare("INSERT INTO moderation_log (moderator_id, action_type, target_id, details, notes) VALUES (?, 'user_ban', ?, ?, ?)");
$logStmt->execute([
    $_SESSION['user_id'],
    $data['user_id'],
    "User #{$data['user_id']} banned",
    $data['notes'] ?? null
]);


echo json_encode(["status" => "banned", "user_id" => $data['user_id']]);
?>
