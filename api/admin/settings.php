<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $val = $pdo->query("SELECT require_approval FROM settings LIMIT 1")->fetchColumn();
    respond_success(["require_approval" => (bool)$val]);
} else {
    $data = json_decode(file_get_contents("php://input"), true);
    $pdo->prepare("UPDATE settings SET require_approval=? WHERE id=1")->execute([(int)$data['require_approval']]);
    respond_success(["require_approval" => (bool)$data['require_approval']]);
}
