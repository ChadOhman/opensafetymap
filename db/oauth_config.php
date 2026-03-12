<?php
return [
    "google" => [
        "client_id" => getenv('GOOGLE_CLIENT_ID') ?: '',
        "client_secret" => getenv('GOOGLE_CLIENT_SECRET') ?: '',
        "redirect_uri" => "http://localhost/api/auth/google.php"
    ],
    "apple" => [
        "client_id" => getenv('APPLE_CLIENT_ID') ?: '',
        "team_id" => getenv('APPLE_TEAM_ID') ?: '',
        "key_id" => getenv('APPLE_KEY_ID') ?: '',
        "private_key_path" => __DIR__ . "/AuthKey_KEYID.p8",
        "redirect_uri" => "http://localhost/api/auth/apple.php"
    ],
    "mastodon" => [
        "client_id" => getenv('MASTODON_CLIENT_ID') ?: '',
        "client_secret" => getenv('MASTODON_CLIENT_SECRET') ?: '',
        "redirect_uri" => "http://localhost/api/auth/mastodon.php"
    ],
    "bluesky" => [
        "client_id" => getenv('BLUESKY_CLIENT_ID') ?: '',
        "client_secret" => getenv('BLUESKY_CLIENT_SECRET') ?: '',
        "redirect_uri" => "http://localhost/api/auth/bluesky.php"
    ]
];
