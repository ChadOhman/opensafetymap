<?php
require_once(__DIR__ . '/../../../db/connect.php');
require_once(__DIR__ . '/../../../db/api_response.php');
require_once(__DIR__ . '/../../../db/auth_helper.php');
require_once(__DIR__ . '/../../../db/rate_limiter.php');

set_cors_headers();
rate_limit($pdo, 'public_read', 120, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond_error("Method not allowed", 405);
}

$latitude = null;
$longitude = null;
$city = null;

$geoip_db = getenv('MAXMIND_DB_PATH');
if ($geoip_db && file_exists($geoip_db) && class_exists('GeoIp2\Database\Reader')) {
    try {
        $ip = get_client_ip();
        $reader = new \GeoIp2\Database\Reader($geoip_db);
        $record = $reader->city($ip);
        $latitude = $record->location->latitude;
        $longitude = $record->location->longitude;
        $city = $record->city->name;
    } catch (Exception $e) {
        // GeoIP lookup failed — return nulls
    }
}

respond_success([
    'latitude' => $latitude,
    'longitude' => $longitude,
    'city' => $city
]);
