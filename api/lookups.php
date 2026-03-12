<?php
require_once(__DIR__ . '/../db/connect.php');
require_once(__DIR__ . '/../db/api_response.php');
require_once(__DIR__ . '/../db/auth_helper.php');
require_once(__DIR__ . '/../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'public_read', 120, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error("Method not allowed", 405);
}

$reporter_modes = $pdo->query("SELECT id, name FROM reporter_modes ORDER BY id")->fetchAll();
$other_parties = $pdo->query("SELECT id, name FROM other_parties ORDER BY id")->fetchAll();
$incident_types = $pdo->query("SELECT id, name FROM incident_types ORDER BY id")->fetchAll();
$severity_levels = $pdo->query("SELECT id, name FROM severity_levels ORDER BY id")->fetchAll();

respond_success([
    'reporter_modes' => $reporter_modes,
    'other_parties' => $other_parties,
    'incident_types' => $incident_types,
    'severity_levels' => $severity_levels
]);
