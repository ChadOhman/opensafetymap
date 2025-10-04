<?php
require_once("../../db/api_response.php");
session_destroy();
respond_success(["message" => "Logged out"]);
