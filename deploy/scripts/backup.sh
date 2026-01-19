#!/bin/bash
set -e

# MindMux Database Backup Script
# Usage: ./backup.sh [destination] [retention_days]
# Example: ./backup.sh /backups/mindmux 30

DESTINATION="${1:-.}"
RETENTION_DAYS="${2:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$DESTINATION/mindmux_$TIMESTAMP"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

info "MindMux Backup Script"
info "Destination: $DESTINATION"
info "Retention: $RETENTION_DAYS days"

# Create backup directory
mkdir -p "$BACKUP_DIR"
info "Created backup directory: $BACKUP_DIR"

# Load environment variables
if [ -f /etc/mindmux/.env ]; then
  export $(cat /etc/mindmux/.env | xargs)
elif [ -f .env ]; then
  export $(cat .env | xargs)
fi

# PostgreSQL backup
if [ -n "$DATABASE_URL" ]; then
  info "Backing up PostgreSQL database..."
  PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
  pg_dump -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') \
          -U $(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p') \
          -d $(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p') \
          --format=custom \
          --file="$BACKUP_DIR/database.dump" || warn "PostgreSQL backup failed"
  info "PostgreSQL backup complete"
else
  warn "DATABASE_URL not set, skipping PostgreSQL backup"
fi

# Redis backup
if [ -n "$REDIS_URL" ]; then
  info "Backing up Redis..."
  REDIS_HOST=$(echo $REDIS_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
  REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([^/]*\).*/\1/p')

  redis-cli -h $REDIS_HOST -p $REDIS_PORT BGSAVE || warn "Redis backup failed"
  sleep 2

  # Copy RDB file
  REDIS_DATA_DIR=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT CONFIG GET dir | tail -n 1)
  if [ -f "$REDIS_DATA_DIR/dump.rdb" ]; then
    cp "$REDIS_DATA_DIR/dump.rdb" "$BACKUP_DIR/redis.rdb"
    info "Redis backup complete"
  else
    warn "Redis RDB file not found"
  fi
else
  warn "REDIS_URL not set, skipping Redis backup"
fi

# Create metadata file
cat > "$BACKUP_DIR/backup.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "mindmux_version": "$(mindmux --version 2>/dev/null || echo 'unknown')",
  "node_version": "$(node -v)",
  "retention_days": $RETENTION_DAYS
}
EOF

# Create tarball
info "Creating backup archive..."
cd "$DESTINATION"
tar -czf "mindmux_$TIMESTAMP.tar.gz" "mindmux_$TIMESTAMP/"
rm -rf "mindmux_$TIMESTAMP"
info "Backup archive: mindmux_$TIMESTAMP.tar.gz"

# Cleanup old backups
info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$DESTINATION" -name "mindmux_*.tar.gz" -mtime +$RETENTION_DAYS -delete

info "Backup completed successfully!"
info "Archive: $DESTINATION/mindmux_$TIMESTAMP.tar.gz"
