<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === "POST") {
    require_active_user();

    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO comments (report_id, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$data['report_id'], $_SESSION['user_id'], $data['content']]);
    echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
}

elseif ($method === "DELETE") {
    require_active_user();

    parse_str(file_get_contents("php://input"), $data);
    $id = $data['id'];

    $stmt = $pdo->prepare("SELECT user_id FROM comments WHERE id=?");
    $stmt->execute([$id]);
    $comment = $stmt->fetch();

    if ($_SESSION['role'] !== 'user' || $_SESSION['user_id'] == $comment['user_id']) {
        $pdo->prepare("DELETE FROM comments WHERE id=?")->execute([$id]);
        echo json_encode(["status" => "deleted"]);
    } else {
        http_response_code(403);
        echo json_encode(["error" => "Unauthorized"]);
    }
}
?>
