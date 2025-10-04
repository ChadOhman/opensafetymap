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
