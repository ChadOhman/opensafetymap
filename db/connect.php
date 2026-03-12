<?php
require_once(__DIR__ . '/env_loader.php');
load_env(__DIR__ . '/../.env');

$dsn = sprintf(
    "mysql:host=%s;dbname=%s;charset=utf8mb4",
    getenv('DB_HOST') ?: 'localhost',
    getenv('DB_NAME') ?: 'accidents'
);
$user = getenv('DB_USER') ?: 'dbuser';
$pass = getenv('DB_PASS') ?: 'dbpass';

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    die("Database connection failed. Please try again later.");
}

// Secure session configuration
$is_prod = getenv('APP_ENV') === 'production';
session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'secure' => $is_prod,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
