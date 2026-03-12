<?php
function respond_success($data = []) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["status" => "success", "data" => $data]);
    exit;
}

function respond_error($message, $code = 400) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode(["status" => "error", "error" => $message]);
    exit;
}
