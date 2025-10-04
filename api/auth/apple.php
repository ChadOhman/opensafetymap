<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");
require_once("../../db/oauth_helper.php");

if (!isset($_POST['id_token'])) respond_error("Missing Apple ID token");

try {
    $user = handle_oauth_login($pdo, "apple", $_POST['id_token']);
    respond_success($user);
} catch (Exception $e) {
    respond_error($e->getMessage(), 500);
}
