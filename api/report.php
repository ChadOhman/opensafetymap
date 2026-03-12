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
    require_csrf();

    $userId = $_SESSION['user_id'];
    $category_id = filter_var($_POST['category_id'] ?? null, FILTER_VALIDATE_INT);
    $description = trim($_POST['description'] ?? '');
    $latitude = filter_var($_POST['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($_POST['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
    $severity_id = filter_var($_POST['severity_id'] ?? null, FILTER_VALIDATE_INT);
    $incident_type_id = filter_var($_POST['incident_type_id'] ?? null, FILTER_VALIDATE_INT);

    if (!$category_id || !$severity_id || !$incident_type_id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }
    if ($description === '' || mb_strlen($description) > 2000) {
        http_response_code(400);
        echo json_encode(["error" => "Description is required and must be under 2000 characters"]);
        exit;
    }

    $photo_url = null;

    // Handle photo upload if provided
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $allowed_types = ['image/jpeg', 'image/png', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $_FILES['photo']['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime, $allowed_types)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid file type. Allowed: JPEG, PNG, WebP"]);
            exit;
        }
        if ($_FILES['photo']['size'] > 5242880) {
            http_response_code(400);
            echo json_encode(["error" => "File too large. Maximum 5MB"]);
            exit;
        }

        $ext = match($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        };
        $fileName = uniqid("report_") . "." . $ext;
        $fileTmp = $_FILES['photo']['tmp_name'];

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
            echo json_encode(["error" => "Failed to upload photo"]);
            exit;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO reports (user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $category_id, $severity_id, $incident_type_id, $description, $latitude, $longitude, $photo_url]);

    echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
}

elseif ($method === "PUT") {
    require_active_user();
    require_csrf();
    parse_str(file_get_contents("php://input"), $data);

    $id = $data['id'];
    $stmt = $pdo->prepare("SELECT user_id FROM reports WHERE id=?");
    $stmt->execute([$id]);
    $report = $stmt->fetch();

    if ($_SESSION['role'] === 'admin' || $_SESSION['user_id'] == $report['user_id']) {
        $stmt = $pdo->prepare("
            UPDATE reports SET category_id=?, severity_id=?, incident_type_id=?, description=?, latitude=?, longitude=? WHERE id=?
        ");
        $stmt->execute([
            $data['category_id'],
            $data['severity_id'],
            $data['incident_type_id'],
            $data['description'],
            $data['latitude'],
            $data['longitude'],
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
    require_csrf();
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
