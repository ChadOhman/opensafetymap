<?php
$dsn = "mysql:host=localhost;dbname=accidents;charset=utf8mb4";
$user = "dbuser";
$pass = "dbpass";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage());
}

session_start();
