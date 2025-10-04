<?php
require_once("../../db/connect.php");
require_once("../../db/api_response.php");
require_once("../../db/auth_helper.php");

require_role("admin");

$stmt = $pdo->query("
    SELECT l.id, l.action_type, l.target_id, l.details, l.notes, l.timestamp, u.username AS moderator
    FROM moderation_log l
    JOIN users u ON l.moderator_id=u.id
    ORDER BY l.timestamp DESC
    LIMIT 200
");

respond_success($stmt->fetchAll());
