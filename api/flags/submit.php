<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_active_user();

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['reason'])) respond_error("Missing reason");

$stmt = $pdo->prepare("INSERT INTO flags (user_id, report_id, comment_id, reason, status, timestamp)
                       VALUES (?,?,?,?, 'pending', NOW())");
$stmt->execute([
    $_SESSION['user_id'],
    $data['report_id'] ?? null,
    $data['comment_id'] ?? null,
    $data['reason']
]);

respond_success(["flag_id" => $pdo->lastInsertId()]);
