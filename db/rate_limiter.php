<?php
require_once(__DIR__ . '/api_response.php');

function rate_limit($key, $max_requests = 30, $window_seconds = 60) {
    $now = time();
    $session_key = "rate_limit_$key";
    if (!isset($_SESSION[$session_key])) {
        $_SESSION[$session_key] = [];
    }
    $_SESSION[$session_key] = array_filter(
        $_SESSION[$session_key],
        fn($t) => $t > $now - $window_seconds
    );
    if (count($_SESSION[$session_key]) >= $max_requests) {
        respond_error("Too many requests. Please wait.", 429);
    }
    $_SESSION[$session_key][] = $now;
}
