<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");
require_once("../vendor/autoload.php");

use Aws\S3\S3Client;

$config = include("../db/s3_config.php");

$s3 = new S3Client([
    "version" => "latest",
    "region"  => $config['region'],
    "credentials" => [
        "key"    => $config['key'],
        "secret" => $config['secret']
    ]
]);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === "POST") {
    require_active_user();

    $userId = $_SESSION['user_id'];
    $category = $_POST['category'];
    $description = $_POST['description'];
    $latitude = $_POST['latitude'];
    $longitude = $_POST['longitude'];
    $severity = $_POST['severity'];
    $incident_type = $_POST['incident_type'];

    $photo_url = null;

    // Handle photo upload if provided
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $fileTmp = $_FILES['photo']['tmp_name'];
        $fileName = uniqid("report_") . "_" . basename($_FILES['photo']['name']);

        try {
            $result = $s3->putObject([
                "Bucket" => $config['bucket'],
                "Key" => "reports/$fileName",
                "SourceFile" => $fileTmp,
                "ACL" => "public-read"
            ]);
            $photo_url = $result['ObjectURL'];
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to upload photo: " . $e->getMessage()]);
            exit;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO reports (user_id, category, description, latitude, longitude, severity, incident_type, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $category, $description, $latitude, $longitude, $severity, $incident_type, $photo_url]);

    echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
}

elseif ($method === "PUT") {
    require_active_user();
    parse_str(file_get_contents("php://input"), $data);

    $id = $data['id'];
    $stmt = $pdo->prepare("SELECT user_id FROM reports WHERE id=?");
    $stmt->execute([$id]);
    $report = $stmt->fetch();

    if ($_SESSION['role'] === 'admin' || $_SESSION['user_id'] == $report['user_id']) {
        $stmt = $pdo->prepare("
            UPDATE reports SET category=?, description=?, latitude=?, longitude=?, severity=?, incident_type=? WHERE id=?
        ");
        $stmt->execute([
            $data['category'],
            $data['description'],
            $data['latitude'],
            $data['longitude'],
            $data['severity'],
            $data['incident_type'],
            $id
        ]);
        echo json_encode(["status" => "updated"]);
    } else {
        http_response_code(403);
        echo json_encode(["error" => "Unauthorized"]);
    }
}

elseif ($method === "DELETE") {
    require_active_user();
    parse_str(file_get_contents("php://input"), $data);

    $id = $data['id'];
    $stmt = $pdo->prepare("SELECT user_id FROM reports WHERE id=?");
    $stmt->execute([$id]);
    $report = $stmt->fetch();

    if ($_SESSION['role'] === 'admin' || $_SESSION['user_id'] == $report['user_id']) {
        $pdo->prepare("DELETE FROM reports WHERE id=?")->execute([$id]);
        echo json_encode(["status" => "deleted"]);
    } else {
        http_response_code(403);
        echo json_encode(["error" => "Unauthorized"]);
    }
}
?>
