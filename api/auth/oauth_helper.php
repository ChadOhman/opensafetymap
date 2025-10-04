<?php
require_once("../../db/connect.php");
require_once("../../db/alias_helper.php");

function handle_oauth_login($provider, $oauthId, $name, $email, $pdo) {
    // Try to find existing user by provider+id
    $stmt = $pdo->prepare("SELECT * FROM users WHERE oauth_provider=? AND oauth_id=?");
    $stmt->execute([$provider, $oauthId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Check ban
        if ($user['status'] === 'banned') {
            session_destroy();
            http_response_code(403);
            echo "❌ Your account has been banned.";
            exit;
        }
        $userId = $user['id'];
    } else {
        // Generate fallback alias
        $username = generate_random_username($pdo);

        $stmt = $pdo->prepare("INSERT INTO users (oauth_provider, oauth_id, name, email, username, role, status, privacy, created_at) VALUES (?,?,?,?,?,'user','active','public',NOW())");
        $stmt->execute([$provider, $oauthId, $name, $email, $username]);
        $userId = $pdo->lastInsertId();
    }

    // Fetch fresh user record
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id=?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Start session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['status'] = $user['status'];

    return $user;
}
