<?php
require_once(__DIR__ . '/api_response.php');

function get_client_ip() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function rate_limit($pdo, $endpoint_group, $max_requests, $window_seconds) {
    $ip = get_client_ip();

    // Prune expired rows (older than 1 hour) — run occasionally
    if (random_int(1, 20) === 1) {
        $pdo->exec("DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    }

    $stmt = $pdo->prepare(
        "SELECT request_count, window_start FROM rate_limits WHERE ip_address = ? AND endpoint_group = ?"
    );
    $stmt->execute([$ip, $endpoint_group]);
    $row = $stmt->fetch();

    $effective_max = $max_requests;
    $is_authenticated = !empty($_SESSION['user_id']) || !empty($_SERVER['HTTP_AUTHORIZATION']);
    if ($endpoint_group === 'public_read' && $is_authenticated) {
        $effective_max = (int)($max_requests * 2.5);
    }

    if ($row) {
        $window_start = strtotime($row['window_start']);
        if (time() - $window_start < $window_seconds) {
            if ($row['request_count'] >= $effective_max) {
                $retry_after = $window_seconds - (time() - $window_start);
                header("Retry-After: $retry_after");
                respond_error("Too many requests. Please wait.", 429);
            }
            $pdo->prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE ip_address = ? AND endpoint_group = ?")
                ->execute([$ip, $endpoint_group]);
        } else {
            $pdo->prepare("UPDATE rate_limits SET request_count = 1, window_start = NOW() WHERE ip_address = ? AND endpoint_group = ?")
                ->execute([$ip, $endpoint_group]);
        }
    } else {
        $pdo->prepare("INSERT INTO rate_limits (ip_address, endpoint_group, request_count, window_start) VALUES (?, ?, 1, NOW())")
            ->execute([$ip, $endpoint_group]);
    }
}
