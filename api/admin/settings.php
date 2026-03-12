<?php
require_once(__DIR__ . '/../../db/connect.php');
require_once(__DIR__ . '/../../db/auth_helper.php');

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_role($pdo, 'admin');
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
    $settings = [];
    foreach ($stmt->fetchAll() as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    respond_success($settings);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    require_role($pdo, 'admin');
    require_csrf();
    $input = json_decode(file_get_contents('php://input'), true);
    foreach ($input as $key => $value) {
        $stmt = $pdo->prepare(
            "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $stmt->execute([$key, (string)$value]);
    }
    respond_success(["message" => "Settings updated"]);
}

respond_error("Method not allowed", 405);
