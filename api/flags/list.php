<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("moderator");

$stmt = $pdo->query("SELECT * FROM flags WHERE status='pending' ORDER BY timestamp DESC");
respond_success($stmt->fetchAll());
