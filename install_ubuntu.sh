#!/usr/bin/env bash
set -euo pipefail

DB_ENGINE="auto"
DB_ENGINE_RESOLVED=""
DB_NAME="accidents"
DB_USER="dbuser"
DB_PASS="dbpass"
SKIP_SEED=0
WEB_SERVER="auto"
WEB_SERVER_RESOLVED=""
APP_ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<USAGE
OpenSafetyMap Ubuntu installer

Usage: sudo ./install_ubuntu.sh [options]
  --db [mysql|mariadb]   Database server to install (default: auto-detect or mysql)
  --db-name NAME         Database name to create (default: accidents)
  --db-user USER         Database user to create (default: dbuser)
  --db-pass PASS         Database user password (default: dbpass)
  --web [apache|nginx]   Web server to install (default: auto-detect or apache)
  --skip-seed            Skip importing seed.sql into the database
  -h, --help             Show this help text

This script installs PHP, required extensions, and your chosen database
server, then creates a database + user matching db/connect.php defaults.
USAGE
}

require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "Please run this script with sudo or as root." >&2
    exit 1
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --db)
        DB_ENGINE="$2"; shift 2 ;;
      --db-name)
        DB_NAME="$2"; shift 2 ;;
      --db-user)
        DB_USER="$2"; shift 2 ;;
      --db-pass)
        DB_PASS="$2"; shift 2 ;;
      --web)
        WEB_SERVER="$2"; shift 2 ;;
      --skip-seed)
        SKIP_SEED=1; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1 ;;
    esac
  done

  if [[ "$DB_ENGINE" != "mysql" && "$DB_ENGINE" != "mariadb" && "$DB_ENGINE" != "auto" ]]; then
    echo "--db must be 'mysql', 'mariadb', or 'auto'" >&2
    exit 1
  fi

  if [[ "$WEB_SERVER" != "apache" && "$WEB_SERVER" != "nginx" && "$WEB_SERVER" != "auto" ]]; then
    echo "--web must be 'apache', 'nginx', or 'auto'" >&2
    exit 1
  fi
}

set_db_engine() {
  local engine="$1"
  DB_ENGINE_RESOLVED="$engine"
  if [[ "$engine" == "mariadb" ]]; then
    DB_SERVICE="mariadb"
    DB_CLI="mariadb"
    DB_SERVER_PACKAGE="mariadb-server"
    DB_CLIENT_PACKAGE="mariadb-client"
    DB_PINGER="mysqladmin"
  else
    DB_SERVICE="mysql"
    DB_CLI="mysql"
    DB_SERVER_PACKAGE="mysql-server"
    DB_CLIENT_PACKAGE="mysql-client"
    DB_PINGER="mysqladmin"
  fi
}

detect_db_engine() {
  if [[ "$DB_ENGINE" != "auto" ]]; then
    set_db_engine "$DB_ENGINE"
    return
  fi

  if systemctl list-units --type=service --all | grep -q "mariadb.service"; then
    set_db_engine "mariadb"; return
  fi
  if systemctl list-units --type=service --all | grep -q "mysql.service"; then
    set_db_engine "mysql"; return
  fi
  if command -v mariadb >/dev/null 2>&1; then
    set_db_engine "mariadb"; return
  fi
  if command -v mysql >/dev/null 2>&1; then
    if mysql --version 2>/dev/null | grep -qi mariadb; then
      set_db_engine "mariadb"
    else
      set_db_engine "mysql"
    fi
    return
  fi

  set_db_engine "mysql"
}

detect_web_server() {
  if [[ "$WEB_SERVER" == "apache" || "$WEB_SERVER" == "nginx" ]]; then
    WEB_SERVER_RESOLVED="$WEB_SERVER"
    return
  fi

  if systemctl list-units --type=service --all | grep -q "apache2.service"; then
    WEB_SERVER_RESOLVED="apache"; return
  fi
  if systemctl list-units --type=service --all | grep -q "nginx.service"; then
    WEB_SERVER_RESOLVED="nginx"; return
  fi

  if command -v apache2 >/dev/null 2>&1; then
    WEB_SERVER_RESOLVED="apache"; return
  fi
  if command -v nginx >/dev/null 2>&1; then
    WEB_SERVER_RESOLVED="nginx"; return
  fi

  WEB_SERVER_RESOLVED="apache"
}

install_packages() {
  echo "Updating apt package lists..."
  apt-get update -y

  echo "Installing PHP + extensions..."
  apt-get install -y php php-cli php-fpm php-mysql php-xml php-mbstring php-curl unzip curl git

  echo "Ensuring database server packages are present (${DB_ENGINE_RESOLVED})..."
  apt-get install -y "$DB_SERVER_PACKAGE" "$DB_CLIENT_PACKAGE"

  echo "Ensuring web server packages are present (${WEB_SERVER_RESOLVED})..."
  if [[ "$WEB_SERVER_RESOLVED" == "apache" ]]; then
    apt-get install -y apache2 libapache2-mod-php
  else
    apt-get install -y nginx
  fi
}

start_services() {
  echo "Starting database service (${DB_SERVICE})..."
  systemctl enable --now "$DB_SERVICE"

  if [[ "$WEB_SERVER_RESOLVED" == "apache" ]]; then
    echo "Starting Apache..."
    systemctl enable --now apache2
  else
    echo "Starting PHP-FPM and Nginx..."
    systemctl enable --now "php$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')-fpm"
    systemctl enable --now nginx
  fi
}

wait_for_database() {
  echo "Waiting for ${DB_ENGINE_RESOLVED} to become ready..."
  local retries=30
  until $DB_PINGER ping --silent >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      echo "Database service did not become ready in time." >&2
      exit 1
    fi
    sleep 1
  done
}

provision_database() {
  echo "Creating database '$DB_NAME' and user '$DB_USER'..."
  $DB_CLI -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  $DB_CLI -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
  $DB_CLI -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';"
  $DB_CLI -e "FLUSH PRIVILEGES;"

  if [[ $SKIP_SEED -eq 0 ]]; then
    local seed_path="${APP_ROOT}/seed.sql"
    if [[ -f "$seed_path" ]]; then
      echo "Importing seed.sql into '$DB_NAME'..."
      $DB_CLI "$DB_NAME" < "$seed_path"
    else
      echo "seed.sql not found at ${seed_path}; skipping import." >&2
    fi
  else
    echo "Skipping seed import as requested."
  fi
}

configure_apache() {
  local app_root="$1"
  cat >/etc/apache2/sites-available/opensafetymap.conf <<EOF
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot ${app_root}

    <Directory ${app_root}>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/opensafetymap-error.log
    CustomLog \${APACHE_LOG_DIR}/opensafetymap-access.log combined
</VirtualHost>
EOF

  a2dissite 000-default.conf >/dev/null 2>&1 || true
  a2ensite opensafetymap.conf
  a2enmod rewrite
  systemctl reload apache2
}

configure_nginx() {
  local app_root="$1"
  local php_sock="/run/php/php$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')-fpm.sock"
  cat >/etc/nginx/sites-available/opensafetymap <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root ${app_root};
    index index.php index.html;

    server_name _;

    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${php_sock};
    }

    location ~ /\.ht {
        deny all;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/opensafetymap /etc/nginx/sites-enabled/opensafetymap
  rm -f /etc/nginx/sites-enabled/default
  systemctl reload nginx
}

print_next_steps() {
  cat <<SUMMARY

Installation complete!

Database:
  Engine : $DB_ENGINE_RESOLVED
  Name   : $DB_NAME
  User   : $DB_USER
  Pass   : $DB_PASS

Web server:
  Selected: $WEB_SERVER_RESOLVED
  Document root: $APP_ROOT

Visit http://localhost in your browser.

If you change DB credentials, update db/connect.php accordingly.
SUMMARY
}

main() {
  parse_args "$@"
  require_root
  detect_db_engine
  detect_web_server
  install_packages
  start_services
  wait_for_database
  provision_database
  if [[ "$WEB_SERVER_RESOLVED" == "apache" ]]; then
    configure_apache "$APP_ROOT"
  else
    configure_nginx "$APP_ROOT"
  fi
  print_next_steps
}

main "$@"
