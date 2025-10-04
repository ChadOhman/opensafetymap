<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");

$total = $pdo->query("SELECT COUNT(*) FROM reports")->fetchColumn();
$approved = $pdo->query("SELECT COUNT(*) FROM reports WHERE status='approved'")->fetchColumn();
$rejected = $pdo->query("SELECT COUNT(*) FROM reports WHERE status='rejected'")->fetchColumn();
$pending = $pdo->query("SELECT COUNT(*) FROM reports WHERE status='pending'")->fetchColumn();

$avg = $pdo->query("SELECT AVG(TIMESTAMPDIFF(HOUR, timestamp, resolved_at)) 
                    FROM reports WHERE resolved_at IS NOT NULL")->fetchColumn();

$trend = $pdo->query("
    SELECT YEARWEEK(timestamp,1) AS week, status, COUNT(*) AS count
    FROM reports
    WHERE status IN ('approved','rejected')
    GROUP BY week, status
    ORDER BY week DESC
    LIMIT 12
")->fetchAll();

respond_success([
    "total" => $total,
    "approved" => $approved,
    "rejected" => $rejected,
    "pending" => $pending,
    "avg_resolution_hours" => round($avg, 2),
    "trend" => $trend
]);
