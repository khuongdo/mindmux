#!/bin/bash
set -e

# MindMux Installation Script
# Supports: Linux (Ubuntu, Debian, CentOS), macOS, WSL
# Usage: sudo ./install.sh [version]

VERSION="${1:-latest}"
INSTALL_DIR="/opt/mindmux"
BIN_DIR="/usr/local/bin"
USER="mindmux"
GROUP="mindmux"
CONFIG_DIR="/etc/mindmux"
LOG_DIR="/var/log/mindmux"
DATA_DIR="/var/lib/mindmux"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root or with sudo"
fi

info "MindMux Installation Script (v$VERSION)"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
  else
    error "Could not detect Linux distribution"
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  OS="darwin"
else
  error "Unsupported OS: $OSTYPE"
fi

info "Detected OS: $OS"

# Check dependencies
info "Checking dependencies..."
command -v node >/dev/null 2>&1 || error "Node.js is required but not installed"
command -v npm >/dev/null 2>&1 || error "npm is required but not installed"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
  error "Node.js 24+ is required (current: $(node -v))"
fi

# Create user and directories (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if ! id "$USER" &>/dev/null; then
    info "Creating $USER user..."
    useradd --system --no-create-home --shell /bin/false "$USER" || warn "User $USER already exists"
  fi

  info "Creating directories..."
  mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LOG_DIR" "$DATA_DIR"
  chown -R "$USER:$GROUP" "$INSTALL_DIR" "$LOG_DIR" "$DATA_DIR"
  chmod 750 "$INSTALL_DIR" "$LOG_DIR" "$DATA_DIR"
  chmod 700 "$CONFIG_DIR"
fi

# Download and install
info "Downloading MindMux ($VERSION)..."
if [ "$VERSION" == "latest" ]; then
  DOWNLOAD_URL="https://registry.npmjs.org/mindmux"
else
  DOWNLOAD_URL="https://registry.npmjs.org/mindmux/$VERSION"
fi

# Install npm package to system location
info "Installing npm package..."
npm install -g mindmux@$VERSION

# Create symlink
info "Creating symlink..."
ln -sf "$(npm root -g)/mindmux/dist/cli.js" "$BIN_DIR/mindmux"
chmod +x "$BIN_DIR/mindmux"

# Setup environment file (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if [ ! -f "$CONFIG_DIR/.env" ]; then
    info "Creating environment configuration..."
    cat > "$CONFIG_DIR/.env" << 'EOF'
# MindMux Environment Configuration
NODE_ENV=production
LOG_LEVEL=info
LOG_FORMAT=json

# Database (update with your credentials)
DATABASE_URL=postgresql://user:password@localhost:5432/mindmux

# Redis
REDIS_URL=redis://localhost:6379/0

# API Configuration
API_KEY_ENCRYPTION_KEY=your-encryption-key-here
API_PORT=3000

# Feature Flags
FEATURE_AGENTS_ENABLED=true
FEATURE_ADVANCED_METRICS=true
EOF
    chmod 600 "$CONFIG_DIR/.env"
    chown "$USER:$GROUP" "$CONFIG_DIR/.env"
    warn "Please update $CONFIG_DIR/.env with your configuration"
  fi

  # Copy systemd service
  info "Installing systemd service..."
  cp deploy/systemd/mindmux.service /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable mindmux || warn "Failed to enable systemd service"
fi

# Verify installation
info "Verifying installation..."
if command -v mindmux >/dev/null 2>&1; then
  INSTALLED_VERSION=$(mindmux --version 2>/dev/null || echo "unknown")
  info "MindMux installed successfully! Version: $INSTALLED_VERSION"
else
  error "Installation verification failed"
fi

info "Installation complete!"

# Print next steps
cat << EOF

${GREEN}Next Steps:${NC}

1. $(if [[ "$OSTYPE" == "linux-gnu"* ]]; then echo "Update configuration: sudo nano $CONFIG_DIR/.env"; fi)

2. $(if [[ "$OSTYPE" == "linux-gnu"* ]]; then echo "Start the service: sudo systemctl start mindmux"; fi)
   $(if [[ "$OSTYPE" == "linux-gnu"* ]]; then echo "Enable on boot: sudo systemctl enable mindmux"; fi)
   $(if [[ "$OSTYPE" == "darwin"* ]]; then echo "Run MindMux: mindmux --help"; fi)

3. Check logs:
   $(if [[ "$OSTYPE" == "linux-gnu"* ]]; then echo "sudo journalctl -u mindmux -f"; fi)
   $(if [[ "$OSTYPE" == "darwin"* ]]; then echo "mindmux logs"; fi)

4. Create first agent:
   mindmux agent:create my-agent --type claude --capabilities code-generation

For more information, visit: https://github.com/yourusername/mindmux

EOF
