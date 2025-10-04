<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("admin"); // Only admins can change roles

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['user_id']) || !isset($data['role'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing parameters"]);
    exit;
}

if ($data['user_id'] == $_SESSION['user_id']) {
    http_response_code(400);
    echo json_encode(["error" => "You cannot change your own role"]);
    exit;
}

$valid_roles = ['user', 'moderator', 'admin'];
if (!in_array($data['role'], $valid_roles)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid role"]);
    exit;
}

$stmt = $pdo->prepare("UPDATE users SET role=? WHERE id=?");
$stmt->execute([$data['role'], $data['user_id']]);

echo json_encode(["status" => "updated", "user_id" => $data['user_id'], "role" => $data['role']]);
?>
