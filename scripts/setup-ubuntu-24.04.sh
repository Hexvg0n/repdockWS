#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
APP_NAME="${APP_NAME:-repdock}"
APP_PORT="${APP_PORT:-3000}"
NODE_MAJOR="${NODE_MAJOR:-22}"
INSTALL_LOCAL_MONGO="${INSTALL_LOCAL_MONGO:-1}"
INSTALL_SYSTEMD="${INSTALL_SYSTEMD:-0}"
APP_USER="${SUDO_USER:-$USER}"

for arg in "$@"; do
  case "$arg" in
    --no-mongo)
      INSTALL_LOCAL_MONGO=0
      ;;
    --systemd)
      INSTALL_SYSTEMD=1
      ;;
    --help|-h)
      cat <<'HELP'
Usage:
  bash scripts/setup-ubuntu-24.04.sh [--no-mongo] [--systemd]

Environment variables:
  APP_DIR              Project directory. Default: current directory.
  APP_NAME             Systemd/Docker name. Default: repdock.
  APP_PORT             Next.js port. Default: 3000.
  INSTALL_LOCAL_MONGO  1 to run MongoDB in Docker, 0 to skip. Default: 1.
  INSTALL_SYSTEMD      1 to create and start a systemd service. Default: 0.

Examples:
  bash scripts/setup-ubuntu-24.04.sh
  bash scripts/setup-ubuntu-24.04.sh --systemd
  INSTALL_LOCAL_MONGO=0 bash scripts/setup-ubuntu-24.04.sh
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

info() {
  printf '\033[1;34m[setup]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[setup]\033[0m %s\n' "$*"
}

require_ubuntu_2404() {
  if [[ ! -r /etc/os-release ]]; then
    warn "Cannot verify OS version. Continuing anyway."
    return
  fi

  # shellcheck disable=SC1091
  source /etc/os-release

  if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
    warn "This script targets Ubuntu 24.04. Detected: ${PRETTY_NAME:-unknown}. Continuing anyway."
  fi
}

install_base_packages() {
  info "Installing base system packages"
  sudo apt-get update
  sudo apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    build-essential \
    openssl \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0
}

install_node() {
  local current_major=""

  if command -v node >/dev/null 2>&1; then
    current_major="$(node -p "process.versions.node.split('.')[0]")"
  fi

  if [[ "$current_major" =~ ^[0-9]+$ && "$current_major" -ge "$NODE_MAJOR" ]]; then
    info "Node.js $(node -v) is already installed"
    return
  fi

  info "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v
  npm -v
}

install_local_mongo() {
  if [[ "$INSTALL_LOCAL_MONGO" != "1" ]]; then
    info "Skipping local MongoDB setup"
    return
  fi

  info "Installing Docker and starting local MongoDB"
  sudo apt-get install -y docker.io
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$APP_USER" || true

  mkdir -p "$APP_DIR/.mongo-data"

  if sudo docker ps -a --format '{{.Names}}' | grep -qx "${APP_NAME}-mongo"; then
    sudo docker start "${APP_NAME}-mongo" >/dev/null
  else
    sudo docker run -d \
      --name "${APP_NAME}-mongo" \
      --restart unless-stopped \
      -p 127.0.0.1:27017:27017 \
      -v "$APP_DIR/.mongo-data:/data/db" \
      mongo:7 >/dev/null
  fi
}

install_rembg() {
  info "Installing rembg into a local Python virtualenv"
  python3 -m venv "$APP_DIR/.venv/rembg"
  "$APP_DIR/.venv/rembg/bin/python" -m pip install --upgrade pip wheel
  "$APP_DIR/.venv/rembg/bin/python" -m pip install "rembg[cpu,cli]"

  mkdir -p "$APP_DIR/.local-bin"
  cat > "$APP_DIR/.local-bin/rembg" <<EOF
#!/usr/bin/env bash
exec "$APP_DIR/.venv/rembg/bin/rembg" "\$@"
EOF
  chmod +x "$APP_DIR/.local-bin/rembg"

  sudo ln -sf "$APP_DIR/.local-bin/rembg" /usr/local/bin/rembg
}

create_env_file() {
  local env_file="$APP_DIR/.env.local"
  local auth_secret

  if [[ -f "$env_file" ]]; then
    info ".env.local already exists; leaving it untouched"
    return
  fi

  info "Creating .env.local with placeholders"
  auth_secret="$(openssl rand -base64 48 | tr -d '\n')"

  cat > "$env_file" <<EOF
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:${APP_PORT}/api/auth/discord/callback
DISCORD_GUILD_ID=
DISCORD_ADMIN_GUILD_ID=
DISCORD_BOT_TOKEN=
MONGODB_URI=mongodb://127.0.0.1:27017/repdock
MONGODB_DB=repdock
AUTH_SECRET=${auth_secret}
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ACBUY_APP_ID=
ACBUY_SECRET_KEY=
REMBG_COMMAND=/usr/local/bin/rembg
REPDOCK_TMP_DIR=/tmp
PORT=${APP_PORT}
EOF

  chmod 600 "$env_file"
}

install_node_dependencies() {
  info "Installing Node dependencies from package-lock.json"
  cd "$APP_DIR"
  npm ci
}

build_app() {
  info "Building Next.js app"
  cd "$APP_DIR"
  sudo systemctl stop "${APP_NAME}.service" >/dev/null 2>&1 || true
  if command -v pm2 >/dev/null 2>&1; then
    pm2 stop "$APP_NAME" >/dev/null 2>&1 || true
  fi
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npm run build
}

install_systemd_service() {
  if [[ "$INSTALL_SYSTEMD" != "1" ]]; then
    info "Skipping systemd service setup. Pass --systemd to enable it."
    return
  fi

  info "Installing systemd service ${APP_NAME}.service"
  sudo tee "/etc/systemd/system/${APP_NAME}.service" >/dev/null <<EOF
[Unit]
Description=RepDock Next.js app
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=NODE_OPTIONS=--max-old-space-size=4096
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now "${APP_NAME}.service"
}

print_summary() {
  cat <<EOF

Setup complete.

Important next steps:
  1. Edit ${APP_DIR}/.env.local and fill:
     DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI
     DISCORD_GUILD_ID or DISCORD_ADMIN_GUILD_ID
     DISCORD_BOT_TOKEN
     CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
     ACBUY_APP_ID, ACBUY_SECRET_KEY if you want ACBuy QC.

  2. For production domain, set:
     DISCORD_REDIRECT_URI=https://your-domain.com/api/auth/discord/callback

  3. Run locally:
     cd ${APP_DIR}
     npm run dev

  4. Run production manually:
     cd ${APP_DIR}
     npm start

  5. If you used --systemd:
     sudo systemctl status ${APP_NAME}.service
     sudo journalctl -u ${APP_NAME}.service -f

EOF
}

main() {
  cd "$APP_DIR"
  require_ubuntu_2404
  install_base_packages
  install_node
  install_local_mongo
  install_rembg
  create_env_file
  install_node_dependencies
  build_app
  install_systemd_service
  print_summary
}

main
