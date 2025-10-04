<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");

require_role("user");

if (!isset($_GET['report_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing report_id"]);
    exit;
}

$stmt = $pdo->prepare("SELECT c.*, u.name FROM comments c JOIN users u ON c.user_id=u.id WHERE report_id=? ORDER BY timestamp ASC");
$stmt->execute([$_GET['report_id']]);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
