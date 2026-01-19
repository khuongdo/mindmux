#!/bin/bash
set -e

# MindMux Database Restore Script
# Usage: ./restore.sh <backup_archive> [backup_dir]
# Example: ./restore.sh /backups/mindmux/mindmux_20250119_120000.tar.gz /var/lib/mindmux

BACKUP_ARCHIVE="$1"
BACKUP_DIR="${2:-.}"

if [ -z "$BACKUP_ARCHIVE" ]; then
  echo "Usage: $0 <backup_archive> [backup_dir]"
  echo "Example: $0 mindmux_20250119_120000.tar.gz /var/lib/mindmux"
  exit 1
fi

if [ ! -f "$BACKUP_ARCHIVE" ]; then
  echo "Error: Backup archive not found: $BACKUP_ARCHIVE"
  exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

info "MindMux Restore Script"
info "Archive: $BACKUP_ARCHIVE"

# Extract archive
EXTRACT_DIR=$(mktemp -d)
trap "rm -rf $EXTRACT_DIR" EXIT

tar -xzf "$BACKUP_ARCHIVE" -C "$EXTRACT_DIR"
BACKUP_NAME=$(ls -1 "$EXTRACT_DIR")
BACKUP_PATH="$EXTRACT_DIR/$BACKUP_NAME"

info "Extracted backup to: $BACKUP_PATH"

# Load metadata
if [ -f "$BACKUP_PATH/backup.json" ]; then
  info "Backup metadata:"
  cat "$BACKUP_PATH/backup.json" | jq '.'
fi

# Confirm restoration
read -p "This will restore from this backup. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  error "Restore cancelled"
fi

# Load environment
if [ -f /etc/mindmux/.env ]; then
  export $(cat /etc/mindmux/.env | xargs)
elif [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Restore PostgreSQL
if [ -f "$BACKUP_PATH/database.dump" ]; then
  info "Restoring PostgreSQL database..."

  if [ -n "$DATABASE_URL" ]; then
    PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
    PGUSER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')

    export PGHOST PGUSER PGDATABASE PGPASSWORD

    # Drop existing database (if desired)
    warn "Dropping existing database (if exists)..."
    dropdb "$PGDATABASE" --if-exists || true

    # Create new database
    createdb "$PGDATABASE"

    # Restore from dump
    pg_restore --dbname="$PGDATABASE" --verbose "$BACKUP_PATH/database.dump" || warn "PostgreSQL restore had warnings"
    info "PostgreSQL restore complete"
  else
    error "DATABASE_URL not set"
  fi
else
  warn "PostgreSQL backup not found in archive"
fi

# Restore Redis
if [ -f "$BACKUP_PATH/redis.rdb" ]; then
  info "Restoring Redis..."

  if [ -n "$REDIS_URL" ]; then
    REDIS_HOST=$(echo $REDIS_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
    REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([^/]*\).*/\1/p')

    # Flush existing data
    warn "Flushing existing Redis data..."
    redis-cli -h $REDIS_HOST -p $REDIS_PORT FLUSHDB || warn "Failed to flush Redis"

    # Get Redis data directory and stop writes
    REDIS_DATA_DIR=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT CONFIG GET dir | tail -n 1)
    redis-cli -h $REDIS_HOST -p $REDIS_PORT BGSAVE

    # Copy backup
    cp "$BACKUP_PATH/redis.rdb" "$REDIS_DATA_DIR/dump.rdb"

    # Restart Redis to load dump
    warn "Restarting Redis to load dump..."
    redis-cli -h $REDIS_HOST -p $REDIS_PORT SHUTDOWN || true
    sleep 2

    info "Redis restore complete"
  else
    warn "REDIS_URL not set"
  fi
else
  warn "Redis backup not found in archive"
fi

info "Restore completed successfully!"
info "Please verify your data and restart MindMux if necessary"
