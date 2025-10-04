<?php
require_once("../db/connect.php");
require_once("../db/auth_helper.php");

require_role("moderator");

// Fetch flags with extra info
$stmt = $pdo->query("
    SELECT f.id, f.target_type, f.target_id, f.reason, f.status, f.timestamp,
           u.name AS flagged_by,
           r.description AS report_description,
           r.photo_url,
           c.content AS comment_content,
           cat.name AS category,
           sev.name AS severity,
           it.name AS incident_type
    FROM flags f
    JOIN users u ON f.user_id=u.id
    LEFT JOIN reports r ON (f.target_type='report' AND f.target_id=r.id)
    LEFT JOIN comments c ON (f.target_type='comment' AND f.target_id=c.id)
    LEFT JOIN categories cat ON r.category_id=cat.id
    LEFT JOIN severity_levels sev ON r.severity_id=sev.id
    LEFT JOIN incident_types it ON r.incident_type_id=it.id
    ORDER BY f.timestamp DESC
");

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
