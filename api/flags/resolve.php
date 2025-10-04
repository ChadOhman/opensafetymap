<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("moderator");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['flag_id'], $data['action'])) respond_error("Missing parameters");

$stmt = $pdo->prepare("SELECT * FROM flags WHERE id=?");
$stmt->execute([$data['flag_id']]);
$flag = $stmt->fetch();
if (!$flag) respond_error("Flag not found", 404);

$resolution = $data['action'] === "dismiss" ? "dismissed" : "removed";
$pdo->prepare("UPDATE flags SET status=? WHERE id=?")->execute([$resolution, $data['flag_id']]);

if ($data['action'] === "remove") {
    if ($flag['report_id']) $pdo->prepare("DELETE FROM reports WHERE id=?")->execute([$flag['report_id']]);
    if ($flag['comment_id']) $pdo->prepare("DELETE FROM comments WHERE id=?")->execute([$flag['comment_id']]);
}

$pdo->prepare("INSERT INTO moderation_log (moderator_id, action_type, target_id, details, notes) 
               VALUES (?,?,?,?,?)")
    ->execute([$_SESSION['user_id'], "flag_" . $data['action'], $flag['report_id'] ?? $flag['comment_id'], "Flag {$resolution}", $data['notes'] ?? null]);

respond_success(["flag_id" => $data['flag_id'], "resolution" => $resolution]);
