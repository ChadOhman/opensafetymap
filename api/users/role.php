<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['user_id'], $data['role'])) respond_error("Missing parameters");

$stmt = $pdo->prepare("UPDATE users SET role=? WHERE id=?");
$stmt->execute([$data['role'], $data['user_id']]);

respond_success(["user_id" => $data['user_id'], "role" => $data['role']]);
