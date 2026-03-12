<?php
require_once(__DIR__ . "/../../db/connect.php");
require_once(__DIR__ . "/../../db/api_response.php");
require_once(__DIR__ . "/../../db/auth_helper.php");
require_once(__DIR__ . "/../../db/rate_limiter.php");
require_once(__DIR__ . "/oauth_helper.php");

rate_limit('auth', 10, 60);
if (!isset($_POST['id_token'])) respond_error("Missing Google ID token");

try {
    $config = require(__DIR__ . '/../../db/oauth_config.php');
    $verified = verify_oauth_token("google", $_POST['id_token'], $config["google"]);
    $user = handle_oauth_login("google", $verified['oauth_id'], $verified['name'], $verified['email'], $pdo);
    respond_success($user);
} catch (Exception $e) {
    respond_error($e->getMessage(), 500);
}
