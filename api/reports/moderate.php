<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("moderator");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['report_id'], $data['action'])) respond_error("Missing parameters");

$status = $data['action'] === "approve" ? "approved" : "rejected";

$stmt = $pdo->prepare("UPDATE reports SET status=?, resolved_at=NOW() WHERE id=?");
$stmt->execute([$status, $data['report_id']]);

$pdo->prepare("INSERT INTO moderation_log (moderator_id, action_type, target_id, details, notes) 
               VALUES (?,?,?,?,?)")
    ->execute([$_SESSION['user_id'], "report_" . $data['action'], $data['report_id'], "Report {$status}", $data['notes'] ?? null]);

respond_success(["report_id" => $data['report_id'], "status" => $status]);
