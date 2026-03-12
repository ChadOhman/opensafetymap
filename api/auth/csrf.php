<?php
require_once(__DIR__ . "/../../db/connect.php");
require_once(__DIR__ . "/../../db/api_response.php");
require_once(__DIR__ . "/../../db/auth_helper.php");

respond_success(["csrf_token" => csrf_token()]);
