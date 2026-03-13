#!/usr/bin/env bash
set -euo pipefail

# OpenSafetyMap — one-command setup
# Installs git and Docker if missing, then builds and starts the app.

REPO_URL="https://github.com/ChadOhman/opensafetymap.git"
APP_DIR="opensafetymap"

install_docker() {
  echo "Installing Docker..."
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian)
        sudo apt-get update -y
        sudo apt-get install -y ca-certificates curl
        sudo install -m 0755 -d /etc/apt/keyrings
        sudo curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
        sudo chmod a+r /etc/apt/keyrings/docker.asc
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ;;
      fedora)
        sudo dnf -y install dnf-plugins-core
        sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ;;
      *)
        echo "Unsupported distro ($ID). Install Docker manually: https://docs.docker.com/engine/install/" >&2
        exit 1
        ;;
    esac
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER" 2>/dev/null || true
  elif [[ "$(uname)" == "Darwin" ]]; then
    echo "Install Docker Desktop for Mac: https://docs.docker.com/desktop/install/mac-install/" >&2
    exit 1
  else
    echo "Install Docker manually: https://docs.docker.com/engine/install/" >&2
    exit 1
  fi
}

# Install git if missing
if ! command -v git &>/dev/null; then
  echo "Installing git..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -y && sudo apt-get install -y git
  elif command -v dnf &>/dev/null; then
    sudo dnf -y install git
  elif command -v brew &>/dev/null; then
    brew install git
  else
    echo "Please install git manually." >&2
    exit 1
  fi
fi

# Install Docker if missing
if ! command -v docker &>/dev/null; then
  install_docker
fi

# Verify docker compose is available
if ! docker compose version &>/dev/null; then
  echo "docker compose not found. Please install Docker Compose v2." >&2
  exit 1
fi

# Clone if not already in the repo
if [[ ! -f "docker-compose.yml" ]]; then
  if [[ -d "$APP_DIR" ]]; then
    cd "$APP_DIR"
  else
    git clone "$REPO_URL"
    cd "$APP_DIR"
  fi
fi

# Create .env from example if missing
if [[ ! -f ".env" ]]; then
  cp .env.example .env
fi

# Build and start
docker compose up --build -d

echo ""
echo "OpenSafetyMap is running at http://localhost:8080"
