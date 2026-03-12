<?php
require_once("api_response.php");

function require_active_user() {
    if (!isset($_SESSION['user_id']) || $_SESSION['status'] === 'banned') {
        respond_error("Unauthorized", 401);
    }
}

function require_role($role) {
    $roles = ["user" => 1, "moderator" => 2, "admin" => 3];
    $userRole = $_SESSION['role'] ?? "guest";

    if (!isset($roles[$userRole]) || $roles[$userRole] < $roles[$role]) {
        respond_error("Forbidden", 403);
    }
}

function csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function require_csrf() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? null;
    if (!$token || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        respond_error("Invalid CSRF token", 403);
    }
}
