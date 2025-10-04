<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_active_user();

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['username']) || empty($data['privacy'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing username or privacy setting"]);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9 _-]{3,30}$/', $data['username'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid username format"]);
    exit;
}

// Ensure unique username
$stmt = $pdo->prepare("SELECT id FROM users WHERE username=? AND id!=?");
$stmt->execute([$data['username'], $_SESSION['user_id']]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(["error" => "Username already taken"]);
    exit;
}


$stmt = $pdo->prepare("UPDATE users SET username=?, privacy=? WHERE id=?");
$stmt->execute([$data['username'], $data['privacy'], $_SESSION['user_id']]);

echo json_encode(["status" => "success"]);
?>
