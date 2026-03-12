<?php
require_once("../../db/api_response.php");
session_start();
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}
respond_success(["message" => "Logged out"]);
