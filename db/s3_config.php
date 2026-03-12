<?php
return [
    "key" => getenv('S3_KEY') ?: '',
    "secret" => getenv('S3_SECRET') ?: '',
    "region" => getenv('S3_REGION') ?: 'us-east-1',
    "bucket" => getenv('S3_BUCKET') ?: ''
];
