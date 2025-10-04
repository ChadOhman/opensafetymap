<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === "POST") {
    require_active_user();

    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO flags (user_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)");
    $stmt->execute([$_SESSION['user_id'], $data['target_type'], $data['target_id'], $data['reason']]);
    echo json_encode(["status" => "flagged"]);
}

elseif ($method === "PUT") {
    require_role("moderator"); // Mods & admins can update flags

    parse_str(file_get_contents("php://input"), $data);
    $stmt = $pdo->prepare("UPDATE flags SET status=? WHERE id=?");
    $stmt->execute([$data['status'], $data['id']]);
    echo json_encode(["status" => "updated"]);
}
?>
