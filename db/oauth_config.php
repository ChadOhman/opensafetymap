<?php
return [
    "google" => [
        "client_id" => "YOUR_GOOGLE_CLIENT_ID",
        "client_secret" => "YOUR_GOOGLE_CLIENT_SECRET",
        "redirect_uri" => "http://localhost/api/auth/google.php"
    ],
    "apple" => [
        "client_id" => "YOUR_APPLE_CLIENT_ID",
        "team_id" => "YOUR_TEAM_ID",
        "key_id" => "YOUR_KEY_ID",
        "private_key_path" => __DIR__ . "/AuthKey_KEYID.p8",
        "redirect_uri" => "http://localhost/api/auth/apple.php"
    ]
    "mastodon" => [
        "client_id" => "YOUR_MASTODON_CLIENT_ID",
        "client_secret" => "YOUR_MASTODON_CLIENT_SECRET",
        "redirect_uri" => "http://localhost/api/auth/mastodon.php"
    ],
    "bluesky" => [
        "redirect_uri" => "http://localhost/api/auth/bluesky.php"
    ]
];
