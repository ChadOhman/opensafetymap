<# 
OpenSafetyMap – Repository Builder
Part 1 of 4: Environment + Folder setup
#>

Write-Host "`n=== OpenSafetyMap Repository Setup ===`n" -ForegroundColor Cyan

# --- Detect Environment ---
$ErrorActionPreference = "Stop"
$repoRoot = Join-Path (Get-Location) "opensafetymap-full"
$zipPath  = "$repoRoot.zip"

if (Test-Path $repoRoot) {
    Write-Host "Removing previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $repoRoot
}
New-Item -ItemType Directory -Force -Path $repoRoot | Out-Null

# --- Folder Structure ---
$folders = @(
    "api/auth",
    "api/reports",
    "api/moderation",
    "api/analytics",
    "api/users",
    "db",
    "public/js",
    "docs",
    "docker",
    ".github/workflows"
)

foreach ($f in $folders) {
    New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $f) | Out-Null
}

# --- Dependency Check: Python & MkDocs ---
function Ensure-MkDocs {
    Write-Host "`nChecking for Python and MkDocs..." -ForegroundColor Cyan
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        Write-Host "Python not found. Please install Python 3.x and rerun the script." -ForegroundColor Red
        exit 1
    }
    try {
        $mkdocs = & python -m mkdocs --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw "not installed" }
        Write-Host "MkDocs already installed."
    }
    catch {
        Write-Host "Installing MkDocs + Material theme..." -ForegroundColor Yellow
        & python -m pip install --upgrade pip
        & python -m pip install mkdocs mkdocs-material
    }
}
Ensure-MkDocs

# --- Utility: Write File Helper ---
function Write-File ($relativePath, [string]$content) {
    $path = Join-Path $repoRoot $relativePath
    $dir  = Split-Path $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Set-Content -Path $path -Value $content -Encoding UTF8
    Write-Host "Created $relativePath"
}

# --- Begin Base Files ---
Write-Host "`nGenerating base repository files..." -ForegroundColor Cyan

# .gitignore
$gitignore = @"
.env
vendor/
node_modules/
__pycache__/
*.zip
*.log
.DS_Store
"@
Write-File ".gitignore" $gitignore

# LICENSE
$license = @"
MIT License

Copyright (c) $(Get-Date -Format yyyy)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
"@
Write-File "LICENSE" $license

# .env.example (with sample secrets)
$envExample = @"
DB_HOST=localhost
DB_NAME=accident_reports
DB_USER=root
DB_PASS=example

AWS_S3_BUCKET=opensafetymap-dev
AWS_ACCESS_KEY_ID=sampleaccesskey
AWS_SECRET_ACCESS_KEY=sampleSecretKey123
AWS_REGION=us-east-1

GOOGLE_CLIENT_ID=sample-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=sample-google-client-secret
APPLE_CLIENT_ID=sample-apple-client-id
APPLE_CLIENT_SECRET=sample-apple-client-secret
MASTODON_CLIENT_ID=sample-mastodon-client-id
MASTODON_CLIENT_SECRET=sample-mastodon-client-secret
BLUESKY_CLIENT_ID=sample-bluesky-client-id
BLUESKY_CLIENT_SECRET=sample-bluesky-client-secret

JWT_SECRET=superSecretJWTKey123
"@
Write-File ".env.example" $envExample

# Makefile
$makefile = @"
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	docker exec -i opensafetymap-db mysql -u root -pexample accident_reports < seed.sql
"@
Write-File "Makefile" $makefile

# Docker Compose & Dockerfile
$dockerCompose = @"
version: '3.8'
services:
  web:
    build: ./docker
    ports:
      - "8080:80"
    volumes:
      - ./public:/var/www/html
      - ./api:/var/www/api
    env_file: .env.example
  db:
    image: mysql:8
    container_name: opensafetymap-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: example
      MYSQL_DATABASE: accident_reports
    volumes:
      - db_data:/var/lib/mysql
      - ./seed.sql:/docker-entrypoint-initdb.d/seed.sql
volumes:
  db_data:
"@
Write-File "docker-compose.yml" $dockerCompose

$dockerfile = @"
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_mysql
COPY ./api /var/www/api
COPY ./public /var/www/html
EXPOSE 80
"@
Write-File "docker/Dockerfile" $dockerfile

Write-Host "`nBase environment created successfully.`n" -ForegroundColor Green
# -------------------------------------------------------
#  PART 2 : DATABASE LAYER
# -------------------------------------------------------

Write-Host "`nBuilding database layer..." -ForegroundColor Cyan

# db/connect.php
$dbConnect = @"
<?php
\$host = getenv('DB_HOST') ?: 'localhost';
\$dbname = getenv('DB_NAME') ?: 'accident_reports';
\$user = getenv('DB_USER') ?: 'root';
\$pass = getenv('DB_PASS') ?: 'example';
try {
    \$pdo = new PDO("mysql:host=\$host;dbname=\$dbname;charset=utf8mb4", \$user, \$pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (PDOException \$e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
?>
"@
Write-File "db/connect.php" $dbConnect

# db/helpers.php
$dbHelpers = @"
<?php
require_once __DIR__ . '/connect.php';

function fetchAll(\$query, \$params = []) {
    global \$pdo;
    \$stmt = \$pdo->prepare(\$query);
    \$stmt->execute(\$params);
    return \$stmt->fetchAll(PDO::FETCH_ASSOC);
}

function fetchOne(\$query, \$params = []) {
    global \$pdo;
    \$stmt = \$pdo->prepare(\$query);
    \$stmt->execute(\$params);
    return \$stmt->fetch(PDO::FETCH_ASSOC);
}

function executeQuery(\$query, \$params = []) {
    global \$pdo;
    \$stmt = \$pdo->prepare(\$query);
    return \$stmt->execute(\$params);
}

function requireAuth() {
    \$headers = apache_request_headers();
    if (!isset(\$headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

function requireRole(\$role) {
    session_start();
    \$userRole = \$_SESSION['role'] ?? 'user';
    if (\$userRole !== \$role && \$role !== 'user') {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
}
?>
"@
Write-File "db/helpers.php" $dbHelpers

# db/schema.sql
$dbSchema = @"
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alias VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  oauth_provider ENUM('google','apple','mastodon','bluesky') DEFAULT 'google',
  oauth_id VARCHAR(255),
  role ENUM('user','moderator','admin') DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  privacy ENUM('public','hidden','private') DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('accident','near_miss') NOT NULL,
  category ENUM('pedestrian','cyclist','motor_vehicle') NOT NULL,
  severity ENUM('minor','moderate','severe') DEFAULT 'minor',
  description TEXT,
  photo_url VARCHAR(500),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT,
  comment_id INT,
  user_id INT NOT NULL,
  reason TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  moderator_id INT NOT NULL,
  action ENUM('approve','reject','ban','unban','note') NOT NULL,
  target_user_id INT,
  target_report_id INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moderator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jwt_token VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
"@
Write-File "db/schema.sql" $dbSchema

# seed.sql
$seedData = @"
INSERT INTO users (alias,email,oauth_provider,role,is_banned,privacy) VALUES
('brave_silver_fox','fox@example.com','google','user',FALSE,'public'),
('quick_fluffy_bunny','bunny@example.com','mastodon','moderator',FALSE,'public'),
('foster_eager_lion','lion@example.com','apple','admin',FALSE,'public');

INSERT INTO reports (user_id,type,category,severity,description,photo_url,latitude,longitude,status) VALUES
(1,'near_miss','pedestrian','minor','Car didn’t stop at crosswalk, almost hit pedestrian.',NULL,53.5461,-113.4938,'approved'),
(2,'accident','cyclist','moderate','Cyclist doored by parked car.',NULL,53.5445,-113.4909,'approved'),
(3,'accident','motor_vehicle','severe','Two cars collided at intersection.',NULL,53.5470,-113.4975,'pending');

INSERT INTO comments (report_id,user_id,comment) VALUES
(1,2,'That intersection is notoriously dangerous!'),
(2,1,'I’ve seen similar near misses there.');

INSERT INTO flags (report_id,user_id,reason) VALUES
(3,2,'Potential duplicate report.');

INSERT INTO moderation_log (moderator_id,action,target_report_id,note) VALUES
(2,'approve',1,'Validated pedestrian near miss.'),
(3,'ban',1,'User temporarily banned for repeated spam.'),
(3,'unban',1,'Ban lifted after review.');

INSERT INTO sessions (user_id,jwt_token,expires_at) VALUES
(1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sampletoken',DATE_ADD(NOW(),INTERVAL 7 DAY)),
(2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sampletoken',DATE_ADD(NOW(),INTERVAL 7 DAY)),
(3,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sampletoken',DATE_ADD(NOW(),INTERVAL 7 DAY));
"@
Write-File "seed.sql" $seedData

Write-Host "`nDatabase layer and sample data created.`n" -ForegroundColor Green

# -------------------------------------------------------
#  PART 3 : BACKEND (API) + FRONTEND (HTML / JS)
# -------------------------------------------------------

Write-Host "`nGenerating API endpoints..." -ForegroundColor Cyan

# ---------------- AUTH ----------------
$googleAuth = @"
<?php
require_once __DIR__ . '/../../db/helpers.php';
header('Content-Type: application/json');

\$data = json_decode(file_get_contents('php://input'), true);
\$oauthId = \$data['oauth_id'] ?? null;
\$email = \$data['email'] ?? null;

if (!\$oauthId || !\$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing fields']);
    exit;
}

\$user = fetchOne("SELECT * FROM users WHERE oauth_id = ?", [\$oauthId]);
if (!\$user) {
    executeQuery("INSERT INTO users (alias,email,oauth_provider,oauth_id) VALUES (?,?,?,?)",
        ['quick_fluffy_bunny', \$email, 'google', \$oauthId]);
    \$user = fetchOne("SELECT * FROM users WHERE oauth_id = ?", [\$oauthId]);
}

echo json_encode(['success' => true, 'user' => \$user]);
?>
"@
Write-File "api/auth/google.php" $googleAuth

# apple.php, mastodon.php, bluesky.php can follow same pattern
foreach ($prov in @("apple","mastodon","bluesky","logout")) {
    $authPhp = "<?php echo json_encode(['success'=>true,'provider'=>'$prov']); ?>"
    Write-File "api/auth/$prov.php" $authPhp
}

# ---------------- REPORTS ----------------
$reportCreate = @"
<?php
require_once __DIR__ . '/../../db/helpers.php';
header('Content-Type: application/json');

\$data = json_decode(file_get_contents('php://input'), true);
\$uid = 1; // demo
\$query = "INSERT INTO reports (user_id,type,category,severity,description,latitude,longitude,status)
VALUES (?,?,?,?,?,?,?,?)";
executeQuery(\$query, [\$uid,\$data['type'],\$data['category'],\$data['severity'],\$data['description'],
\$data['latitude'],\$data['longitude'],'pending']);
echo json_encode(['success'=>true]);
?>
"@
Write-File "api/reports/create.php" $reportCreate

$reportList = @"
<?php
require_once __DIR__ . '/../../db/helpers.php';
header('Content-Type: application/json');
\$reports = fetchAll('SELECT * FROM reports ORDER BY created_at DESC');
echo json_encode(\$reports);
?>
"@
Write-File "api/reports/list.php" $reportList

Write-File "api/reports/delete.php" "<?php echo json_encode(['success'=>true]); ?>"
Write-File "api/reports/flag.php" "<?php echo json_encode(['success'=>true]); ?>"

# ---------------- MODERATION ----------------
$approvePhp = "<?php echo json_encode(['success'=>true,'action'=>'approve']); ?>"
$rejectPhp  = "<?php echo json_encode(['success'=>true,'action'=>'reject']); ?>"
$banPhp     = "<?php echo json_encode(['success'=>true,'action'=>'ban']); ?>"
$unbanPhp   = "<?php echo json_encode(['success'=>true,'action'=>'unban']); ?>"
$notesPhp   = "<?php echo json_encode(['success'=>true,'action'=>'note']); ?>"
$historyPhp = "<?php echo json_encode(['success'=>true,'action'=>'history']); ?>"
Write-File "api/moderation/approve.php" $approvePhp
Write-File "api/moderation/reject.php" $rejectPhp
Write-File "api/moderation/ban.php" $banPhp
Write-File "api/moderation/unban.php" $unbanPhp
Write-File "api/moderation/notes.php" $notesPhp
Write-File "api/moderation/history.php" $historyPhp

# ---------------- ANALYTICS ----------------
$analyticsTrend = "<?php echo json_encode(['trend'=>'sample']); ?>"
$analyticsHeat  = "<?php echo json_encode(['heatmap'=>true]); ?>"
$analyticsSev   = "<?php echo json_encode(['severity'=>['minor'=>5,'moderate'=>2,'severe'=>1]]); ?>"
$analyticsRes   = "<?php echo json_encode(['resolution'=>['average_days'=>3]]); ?>"
Write-File "api/analytics/trends.php" $analyticsTrend
Write-File "api/analytics/heatmap.php" $analyticsHeat
Write-File "api/analytics/severity.php" $analyticsSev
Write-File "api/analytics/resolution.php" $analyticsRes

# ---------------- USERS ----------------
$profilePhp = "<?php echo json_encode(['profile'=>'ok']); ?>"
$directoryPhp = "<?php echo json_encode(['directory'=>'ok']); ?>"
$privacyPhp = "<?php echo json_encode(['privacy_updated'=>true]); ?>"
$rolePhp = "<?php echo json_encode(['role_updated'=>true]); ?>"
Write-File "api/users/profile.php" $profilePhp
Write-File "api/users/directory.php" $directoryPhp
Write-File "api/users/update_privacy.php" $privacyPhp
Write-File "api/users/update_role.php" $rolePhp

Write-Host "`nBackend endpoints generated." -ForegroundColor Green


# -------------------------------------------------------
#  FRONTEND
# -------------------------------------------------------
Write-Host "`nBuilding frontend pages and JS modules..." -ForegroundColor Cyan

# index.html
$indexHtml = @"
<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<title>OpenSafetyMap</title>
<link rel='stylesheet' href='https://unpkg.com/leaflet/dist/leaflet.css'>
<script src='https://unpkg.com/leaflet/dist/leaflet.js'></script>
<script src='https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js'></script>
</head>
<body>
<h1>OpenSafetyMap</h1>
<div id='map' style='height:90vh;'></div>
<script src='js/api.js'></script>
<script src='js/report_submission.js'></script>
<script>
const map = L.map('map').setView([53.5461, -113.4938], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
fetch('/api/reports/list.php')
  .then(r=>r.json())
  .then(data=>{
    const markers = L.markerClusterGroup();
    data.forEach(r=>{
      const m = L.marker([r.latitude, r.longitude]).bindPopup(r.description);
      markers.addLayer(m);
    });
    map.addLayer(markers);
  });
</script>
</body>
</html>
"@
Write-File "public/index.html" $indexHtml

# login.html
$loginHtml = "<html><body><h2>Login (OAuth Demo)</h2><button>Login with Google</button></body></html>"
Write-File "public/login.html" $loginHtml

# moderation_dashboard.html
$modHtml = "<html><body><h2>Moderation Dashboard</h2><div id='reports'></div><script src='js/moderation.js'></script></body></html>"
Write-File "public/moderation_dashboard.html" $modHtml

# user_directory.html
$dirHtml = "<html><body><h2>User Directory</h2><div id='users'></div><script src='js/profile.js'></script></body></html>"
Write-File "public/user_directory.html" $dirHtml

# user_profile.html
$profHtml = "<html><body><h2>User Profile</h2><div id='profile'></div><script src='js/profile.js'></script></body></html>"
Write-File "public/user_profile.html" $profHtml

# JS Modules
$apiJs = @"
async function fetchJSON(url, options={}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Network error');
  return await res.json();
}
"@
Write-File "public/js/api.js" $apiJs

$reportJs = "console.log('Report submission module loaded');"
$modJs = "console.log('Moderation module loaded');"
$analyticsJs = "console.log('Analytics module loaded');"
$profileJs = "console.log('Profile module loaded');"
Write-File "public/js/report_submission.js" $reportJs
Write-File "public/js/moderation.js" $modJs
Write-File "public/js/analytics.js" $analyticsJs
Write-File "public/js/profile.js" $profileJs

Write-Host "`nFrontend created successfully.`n" -ForegroundColor Green
# -------------------------------------------------------
#  PART 4 : DOCS + MKDOCS + ZIP
# -------------------------------------------------------

Write-Host "`nCreating documentation and MkDocs config..." -ForegroundColor Cyan

# --- mkdocs.yml ---
$mkdocs = @"
site_name: OpenSafetyMap
site_description: Community safety reporting and analytics platform
theme:
  name: material
nav:
  - Home: index.md
  - Quickstart: quickstart.md
  - Features: features.md
  - Roadmap: roadmap.md
  - Changelog: changelog.md
  - Contributing: contributing.md
  - Security: security.md
  - Code of Conduct: code_of_conduct.md
  - Setup: setup.md
  - User Guide: user_guide.md
  - Moderator Guide: moderator_guide.md
  - Admin Guide: admin_guide.md
  - Developer Guide: developer_guide.md
  - Architecture: architecture.md
  - Analytics: analytics.md
  - Glossary: glossary.md
  - FAQ: faq.md
"@
Write-File "mkdocs.yml" $mkdocs

# --- Docs markdown placeholders ---
$docs = @{
    "index.md" = "# OpenSafetyMap\n\nWelcome to the OpenSafetyMap documentation."
    "quickstart.md" = "# Quickstart\n\nRun `make up` then visit http://localhost:8080."
    "features.md" = "# Features\n\n- Reporting\n- Moderation\n- Analytics\n- OAuth Login"
    "roadmap.md" = "# Roadmap\n\n- [x] MVP\n- [ ] Mobile App\n- [ ] Live Analytics"
    "changelog.md" = "# Changelog\n\n## v1.0.0\nInitial full refactor release."
    "contributing.md" = "# Contributing\n\nSubmit PRs via GitHub."
    "security.md" = "# Security Policy\n\nReport issues via Issues tab."
    "code_of_conduct.md" = "# Code of Conduct\n\nBe respectful and inclusive."
    "setup.md" = "# Setup\n\nInstructions for local Docker setup."
    "user_guide.md" = "# User Guide\n\nHow to report incidents and comment."
    "moderator_guide.md" = "# Moderator Guide\n\nHow to approve or reject reports."
    "admin_guide.md" = "# Admin Guide\n\nHow to manage roles and settings."
    "developer_guide.md" = "# Developer Guide\n\nAPI and folder overview."
    "architecture.md" = "# Architecture\n\nSystem overview diagram below."
    "analytics.md" = "# Analytics\n\nInformation about trends and heatmaps."
    "glossary.md" = "# Glossary\n\nKey terms and abbreviations."
    "faq.md" = "# FAQ\n\n**Q:** How to contribute?\n**A:** Fork and submit PR."
}
foreach ($pair in $docs.GetEnumerator()) {
    Write-File ("docs/" + $pair.Key) $pair.Value
}

# --- Diagrams placeholders ---
$diagrams = @("system_overview.png","db_schema_erd.png","moderation_workflow.png","analytics_dashboard.png")
foreach ($img in $diagrams) {
    $path = Join-Path $repoRoot ("docs/" + $img)
    Set-Content -Path $path -Value "" -Encoding Byte  # empty placeholder
    Write-Host "Created placeholder $img"
}

# --- GitHub workflows ---
$ciYaml = @"
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate PHP
        run: php -l api/reports/create.php
"@
Write-File ".github/workflows/ci.yml" $ciYaml

$docsYaml = @"
name: Deploy Docs
on:
  push:
    branches: [ main ]
    paths: [ 'docs/**', 'mkdocs.yml' ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.x'
      - run: pip install mkdocs mkdocs-material
      - run: mkdocs gh-deploy --force
"@
Write-File ".github/workflows/docs.yml" $docsYaml

# -------------------------------------------------------
#  ZIP CREATION
# -------------------------------------------------------
Write-Host "`nZipping repository..." -ForegroundColor Cyan
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($repoRoot, $zipPath)
Write-Host "`nRepository packaged successfully:`n$zipPath" -ForegroundColor Green
Write-Host "`nYou can now extract and push this to GitHub.`n" -ForegroundColor Cyan
