<?php
function respond_success($data = []) {
    echo json_encode(["status" => "success", "data" => $data]);
    exit;
}

function respond_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(["status" => "error", "error" => $message]);
    exit;
}
