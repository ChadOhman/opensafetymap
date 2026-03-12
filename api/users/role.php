<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");
require_csrf();

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['user_id'], $data['role'])) respond_error("Missing parameters");

$valid_roles = ['user', 'moderator', 'admin'];
if (!in_array($data['role'], $valid_roles)) respond_error("Invalid role");
if ($data['user_id'] == $_SESSION['user_id']) respond_error("Cannot change your own role");

$stmt = $pdo->prepare("UPDATE users SET role=? WHERE id=?");
$stmt->execute([$data['role'], $data['user_id']]);

respond_success(["user_id" => $data['user_id'], "role" => $data['role']]);
