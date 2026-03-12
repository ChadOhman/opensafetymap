<?php
require_once(__DIR__ . "/../../db/connect.php");
require_once(__DIR__ . "/../../db/alias_helper.php");

function verify_oauth_token($provider, $token, $config) {
    switch ($provider) {
        case 'google':
            return verify_google_token($token, $config);
        case 'apple':
            return verify_apple_token($token, $config);
        case 'mastodon':
            return verify_mastodon_token($token, $config);
        case 'bluesky':
            return verify_bluesky_token($token, $config);
        default:
            throw new Exception("Unsupported OAuth provider: $provider");
    }
}

function verify_google_token($token, $config) {
    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($token);
    $response = @file_get_contents($url);
    if ($response === false) {
        throw new Exception("Failed to verify Google token");
    }
    $data = json_decode($response, true);
    if (!$data || !isset($data['sub'])) {
        throw new Exception("Invalid Google token");
    }
    if (!empty($config['client_id']) && $data['aud'] !== $config['client_id']) {
        throw new Exception("Google token audience mismatch");
    }
    return [
        'oauth_id' => $data['sub'],
        'name' => $data['name'] ?? $data['email'] ?? '',
        'email' => $data['email'] ?? ''
    ];
}

function verify_apple_token($token, $config) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception("Invalid Apple JWT format");
    }
    $header = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

    if (!$header || !$payload || !isset($header['kid'])) {
        throw new Exception("Invalid Apple token structure");
    }

    // Fetch Apple's public keys and verify kid exists
    $keysJson = @file_get_contents("https://appleid.apple.com/auth/keys");
    if ($keysJson === false) {
        throw new Exception("Failed to fetch Apple public keys");
    }
    $keys = json_decode($keysJson, true);
    $matchedKey = null;
    foreach ($keys['keys'] as $key) {
        if ($key['kid'] === $header['kid']) {
            $matchedKey = $key;
            break;
        }
    }
    if (!$matchedKey) {
        throw new Exception("Apple token key ID not found");
    }

    // Validate claims
    if (!empty($config['client_id']) && ($payload['aud'] ?? '') !== $config['client_id']) {
        throw new Exception("Apple token audience mismatch");
    }
    if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
        throw new Exception("Apple token issuer mismatch");
    }
    if (($payload['exp'] ?? 0) < time()) {
        throw new Exception("Apple token expired");
    }

    return [
        'oauth_id' => $payload['sub'] ?? '',
        'name' => $payload['email'] ?? '',
        'email' => $payload['email'] ?? ''
    ];
}

function verify_mastodon_token($token, $config) {
    // Token format: "instance|access_token" or just access_token (defaults to mastodon.social)
    $instance = 'mastodon.social';
    $accessToken = $token;
    if (strpos($token, '|') !== false) {
        [$instance, $accessToken] = explode('|', $token, 2);
    }

    $url = "https://" . urlencode($instance) . "/api/v1/accounts/verify_credentials";
    $context = stream_context_create([
        'http' => [
            'header' => "Authorization: Bearer $accessToken\r\n",
            'timeout' => 10
        ]
    ]);
    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        throw new Exception("Failed to verify Mastodon token");
    }
    $data = json_decode($response, true);
    if (!$data || !isset($data['id'])) {
        throw new Exception("Invalid Mastodon token");
    }
    return [
        'oauth_id' => $data['id'],
        'name' => $data['display_name'] ?? $data['username'] ?? '',
        'email' => $data['acct'] ?? ''
    ];
}

function verify_bluesky_token($token, $config) {
    $url = "https://bsky.social/xrpc/com.atproto.server.getSession";
    $context = stream_context_create([
        'http' => [
            'header' => "Authorization: Bearer $token\r\n",
            'timeout' => 10
        ]
    ]);
    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        throw new Exception("Failed to verify Bluesky token");
    }
    $data = json_decode($response, true);
    if (!$data || !isset($data['did'])) {
        throw new Exception("Invalid Bluesky token");
    }
    return [
        'oauth_id' => $data['did'],
        'name' => $data['handle'] ?? '',
        'email' => $data['email'] ?? ''
    ];
}

function handle_oauth_login($provider, $oauthId, $name, $email, $pdo) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE oauth_provider=? AND oauth_id=?");
    $stmt->execute([$provider, $oauthId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        if ($user['status'] === 'banned') {
            session_destroy();
            http_response_code(403);
            echo json_encode(["status" => "error", "error" => "Your account has been banned."]);
            exit;
        }
        $userId = $user['id'];
    } else {
        $username = generate_random_username($pdo);
        $stmt = $pdo->prepare("INSERT INTO users (oauth_provider, oauth_id, name, email, username, role, status, privacy, created_at) VALUES (?,?,?,?,?,'user','active','public',NOW())");
        $stmt->execute([$provider, $oauthId, $name, $email, $username]);
        $userId = $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['status'] = $user['status'];

    return $user;
}
