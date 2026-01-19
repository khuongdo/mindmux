# MindMux Deployment Guide

Deploy MindMux to production environments.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [systemd Service](#systemd-service)
3. [Docker Deployment](#docker-deployment)
4. [Configuration](#configuration)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Deployment Options

### Development
- Local machine with npm

### Production
- systemd service (Linux)
- Docker container
- Kubernetes (future)

## systemd Service

Deploy MindMux as a systemd service on Linux.

### Prerequisites

- Linux system with systemd
- Node.js 20+ installed globally
- User account for service (e.g., `mindmux`)

### Create Service User

```bash
# Create user (if needed)
sudo useradd -r -s /bin/bash mindmux

# Create home directory
sudo mkdir -p /home/mindmux/.mindmux
sudo chown -R mindmux:mindmux /home/mindmux
```

### Install MindMux

```bash
# Install globally
sudo npm install -g mindmux

# Verify installation
sudo -u mindmux /usr/local/bin/mux --version
```

### Create systemd Service File

Create `/etc/systemd/system/mindmux.service`:

```ini
[Unit]
Description=MindMux Multi-Agent CLI
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mindmux
Group=mindmux
WorkingDirectory=/home/mindmux
Environment="PATH=/usr/local/bin:/usr/bin"
Environment="NODE_ENV=production"
Environment="HOME=/home/mindmux"

# Start command (keep service running)
ExecStart=/usr/local/bin/node -e "require('mindmux').startServer()"

# Auto-restart on failure
Restart=on-failure
RestartSec=10

# Resource limits
MemoryLimit=2G
CPUQuota=80%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mindmux

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable mindmux

# Start service
sudo systemctl start mindmux

# Check status
sudo systemctl status mindmux

# View logs
sudo journalctl -u mindmux -f
```

### Manage Service

```bash
# Start
sudo systemctl start mindmux

# Stop
sudo systemctl stop mindmux

# Restart
sudo systemctl restart mindmux

# View logs
sudo journalctl -u mindmux --lines 100
sudo journalctl -u mindmux -f  # Follow

# Check status
sudo systemctl status mindmux
```

## Docker Deployment

Deploy MindMux in Docker containers.

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    tmux \
    openssh-client \
    git

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create config directory
RUN mkdir -p /root/.mindmux

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node dist/cli.js agent:list || exit 1

# Run MindMux
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
```

### Build Image

```bash
docker build -t mindmux:latest .
docker tag mindmux:latest mindmux:0.1.0
```

### Run Container

**Basic:**
```bash
docker run -it mindmux:latest agent:list
```

**With persistent configuration:**
```bash
docker run -it \
  -v mindmux-config:/root/.mindmux \
  mindmux:latest \
  agent:list
```

**With custom config file:**
```bash
docker run -it \
  -v ~/.mindmux/config.json:/root/.mindmux/config.json \
  mindmux:latest \
  agent:list
```

**With environment variables:**
```bash
docker run -it \
  -e MINDMUX_CLAUDE_API_KEY="sk-ant-..." \
  -e MINDMUX_LOGGING_LEVEL="debug" \
  mindmux:latest \
  agent:list
```

### Docker Compose

Create `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  mindmux:
    build: .
    container_name: mindmux-dev
    image: mindmux:latest

    # Keep running
    command: tail -f /dev/null

    # Volume for persistent config
    volumes:
      - ./:/app
      - mindmux-config:/root/.mindmux

    # Environment variables
    environment:
      - NODE_ENV=development
      - MINDMUX_LOGGING_LEVEL=debug
      - MINDMUX_CLAUDE_API_KEY=${MINDMUX_CLAUDE_API_KEY}
      - MINDMUX_GEMINI_API_KEY=${MINDMUX_GEMINI_API_KEY}

    # Interactive terminal
    stdin_open: true
    tty: true

volumes:
  mindmux-config:
```

**Start:**
```bash
docker-compose up -d
docker-compose exec mindmux mux agent:list
```

**Stop:**
```bash
docker-compose down
```

## Configuration

### Production Config

Create `/home/mindmux/.mindmux/config.json`:

```json
{
  "version": "0.1.0",
  "defaultAgentType": "claude",
  "defaultModel": {
    "claude": "claude-opus-4-5-20250929",
    "gemini": "gemini-2-5-flash",
    "gpt4": "gpt-4-turbo"
  },
  "timeout": 3600000,
  "maxConcurrentAgents": 20,
  "logging": {
    "level": "warn",
    "enableAgentLogs": true,
    "maxLogSizeMB": 500,
    "format": "json"
  },
  "tmux": {
    "sessionPrefix": "prod-mux",
    "keepSessionsAlive": true
  }
}
```

### Environment Variables

Set in `/etc/systemd/system/mindmux.service`:

```ini
[Service]
Environment="MINDMUX_CLAUDE_API_KEY=sk-ant-..."
Environment="MINDMUX_GEMINI_API_KEY=AIza..."
Environment="MINDMUX_GPT4_API_KEY=sk-..."
Environment="MINDMUX_LOGGING_LEVEL=warn"
```

Or in Docker environment file `.env`:

```bash
MINDMUX_CLAUDE_API_KEY=sk-ant-...
MINDMUX_GEMINI_API_KEY=AIza...
MINDMUX_GPT4_API_KEY=sk-...
```

Load with:
```bash
docker run --env-file .env mindmux:latest
```

## Monitoring

### systemd Logs

```bash
# Last 50 lines
sudo journalctl -u mindmux -n 50

# Follow in real-time
sudo journalctl -u mindmux -f

# Since specific time
sudo journalctl -u mindmux --since "2025-01-19 10:00:00"

# Export to file
sudo journalctl -u mindmux > mindmux-logs.txt
```

### MindMux Logs

```bash
# Agent logs
ls ~/.mindmux/logs/agents/

# View agent log
tail -f ~/.mindmux/logs/agents/{agent-id}.log

# Search logs
grep "ERROR" ~/.mindmux/logs/agents/*.log
```

### Health Check

```bash
# Check service status
systemctl is-active mindmux

# Check API health (when API server added)
curl http://localhost:8080/api/health
```

### Resource Monitoring

```bash
# View process
ps aux | grep -E "[m]indmux|[n]ode"

# Monitor resources
top -p $(pgrep -f mindmux)

# Check disk usage
du -sh ~/.mindmux/

# Check log sizes
du -sh ~/.mindmux/logs/
```

## Backup and Recovery

### Backup Configuration

```bash
# Backup config
sudo tar -czf mindmux-backup-$(date +%Y%m%d).tar.gz /home/mindmux/.mindmux/

# Upload to safe location
gsutil cp mindmux-backup-*.tar.gz gs://backups/

# Or S3
aws s3 cp mindmux-backup-*.tar.gz s3://backups/
```

### Restore Configuration

```bash
# Extract backup
tar -xzf mindmux-backup-20250119.tar.gz

# Restore to location
sudo cp -r home/mindmux/.mindmux /home/mindmux/

# Fix permissions
sudo chown -R mindmux:mindmux /home/mindmux/.mindmux
```

### Clean Old Logs

```bash
# Delete logs older than 30 days
find ~/.mindmux/logs -name "*.log.*" -mtime +30 -delete

# Manual cleanup
rm ~/.mindmux/logs/agents/*.log.1
```

## Scaling

### Increase Resource Limits

In systemd service:

```ini
[Service]
MemoryLimit=4G
CPUQuota=100%
TasksMax=1000
```

### Multiple Instances

Run multiple MindMux instances on different ports:

```bash
# Instance 1
PORT=8080 mux agent:list

# Instance 2
PORT=8081 mux agent:list
```

## Troubleshooting

### Service Won't Start

```bash
# Check status
sudo systemctl status mindmux

# View detailed error
sudo journalctl -u mindmux -e

# Common issues:
# - Path not found: Check ExecStart path
# - Permission denied: Check User/Group
# - Node not found: Install Node.js globally
```

### High Memory Usage

```bash
# Check memory
free -h

# Check process memory
ps aux | grep mindmux

# Reduce concurrent agents
mux config:show --option maxConcurrentAgents
# Reduce in config.json
```

### Tmux Sessions Not Persisting

```bash
# Check tmux
tmux list-sessions

# Ensure keepSessionsAlive is true in config.json
# Restart service
sudo systemctl restart mindmux
```

### API Connection Issues

```bash
# Check service running
sudo systemctl status mindmux

# Test connection
curl http://localhost:8080/api/health

# Check firewall
sudo ufw allow 8080
```

## Logs and Debugging

### Enable Debug Logging

```bash
# Update config
echo '{"logging":{"level":"debug"}}' >> ~/.mindmux/config.json

# Or set environment variable
export MINDMUX_LOGGING_LEVEL=debug

# Restart service
sudo systemctl restart mindmux
```

### Analyze Logs

```bash
# Count errors
grep -c "ERROR" ~/.mindmux/logs/mindmux.log

# Find slowest operations
grep "duration" ~/.mindmux/logs/mindmux.log | sort -t= -k2 -rn | head -10

# Track agent lifecycle
grep -E "created|started|stopped|error" ~/.mindmux/logs/mindmux.log
```

## Performance Tuning

### Config Optimization

```json
{
  "timeout": 1800000,
  "maxConcurrentAgents": 5,
  "logging": {
    "level": "warn",
    "maxLogSizeMB": 100
  }
}
```

### System Optimization

```bash
# Increase file descriptor limits
ulimit -n 65536

# Add to /etc/security/limits.conf
mindmux soft nofile 65536
mindmux hard nofile 65536
```

---

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or [GETTING_STARTED.md](./GETTING_STARTED.md).
