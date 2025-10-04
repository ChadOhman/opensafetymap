<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['user_id'])) respond_error("Missing user_id");

$stmt = $pdo->prepare("UPDATE users SET status='banned' WHERE id=?");
$stmt->execute([$data['user_id']]);

// Log
$pdo->prepare("INSERT INTO moderation_log (moderator_id, action_type, target_id, details, notes) 
               VALUES (?,?,?,?,?)")
    ->execute([$_SESSION['user_id'], "user_ban", $data['user_id'], "User banned", $data['notes'] ?? null]);

respond_success(["user_id" => $data['user_id'], "status" => "banned"]);
