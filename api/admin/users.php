<?php
require_once("../../db/connect.php");
require_once("../../db/auth_helper.php");

require_role("admin"); // Only admins

$stmt = $pdo->query("SELECT id, name, email, oauth_provider, role, created_at FROM users ORDER BY created_at DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
