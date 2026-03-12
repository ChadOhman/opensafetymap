<?php
function respond_success($data = []) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => true, "data" => $data]);
    exit;
}

function respond_error($message, $code = 400) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode(["success" => false, "error" => $message, "code" => $code]);
    exit;
}
