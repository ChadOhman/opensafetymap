<?php
require_once(__DIR__ . '/api_response.php');

/**
 * Get the currently authenticated user from token or session.
 * Returns user array or null.
 */
function get_current_user_from_auth($pdo) {
    // Check Bearer token first
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $matches)) {
        $token = $matches[1];
        $stmt = $pdo->prepare(
            "SELECT u.* FROM auth_tokens t
             JOIN users u ON t.user_id = u.id
             WHERE t.token = ? AND t.expires_at > NOW()"
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        if ($user) {
            $GLOBALS['_auth_method'] = 'token';
            return $user;
        }
    }

    // Fall back to session
    if (!empty($_SESSION['user_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            $GLOBALS['_auth_method'] = 'session';
            return $user;
        }
    }

    $GLOBALS['_auth_method'] = null;
    return null;
}

function get_auth_method() {
    return $GLOBALS['_auth_method'] ?? null;
}

function require_active_user($pdo) {
    $user = get_current_user_from_auth($pdo);
    if (!$user || $user['status'] === 'banned') {
        respond_error("Unauthorized", 401);
    }
    return $user;
}

function require_role($pdo, $role) {
    $user = require_active_user($pdo);
    $roles = ["user" => 1, "moderator" => 2, "admin" => 3];
    $userRole = $user['role'] ?? 'user';
    if (!isset($roles[$userRole]) || $roles[$userRole] < $roles[$role]) {
        respond_error("Forbidden", 403);
    }
    return $user;
}

function csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function require_csrf() {
    // Token-based auth is immune to CSRF
    if (get_auth_method() === 'token') return;

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? null;
    if (!$token || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        respond_error("Invalid CSRF token", 403);
    }
}

/**
 * Check honeypot field for anonymous POST endpoints.
 */
function check_honeypot() {
    if (!empty($_POST['website'])) {
        respond_error("Invalid request", 400);
    }
}

/**
 * Generate a new auth token for a user.
 */
function create_auth_token($pdo, $user_id, $device_name = null, $expires_days = 30) {
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime("+{$expires_days} days"));
    $stmt = $pdo->prepare(
        "INSERT INTO auth_tokens (user_id, token, device_name, expires_at)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $token, $device_name, $expires]);
    return $token;
}

/**
 * Set CORS headers based on config.
 */
function set_cors_headers() {
    $origin = getenv('CORS_ORIGIN') ?: '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-TOKEN");
    if ($origin !== '*') {
        header("Access-Control-Allow-Credentials: true");
    }
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
