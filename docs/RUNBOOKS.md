# Operations Runbooks

Quick reference guides for common operational tasks and incident responses.

## Table of Contents

1. [Deployment](#deployment)
2. [Scaling](#scaling)
3. [Backup & Recovery](#backup--recovery)
4. [Incident Response](#incident-response)
5. [Troubleshooting](#troubleshooting)

---

## Deployment

### Initial Production Deployment

**Time Required:** 30 minutes
**Risk Level:** Medium

#### Prerequisites

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Staging environment tested
- [ ] Backup strategy validated
- [ ] Monitoring configured
- [ ] Communication sent to stakeholders

#### Steps

1. **Prepare**
   ```bash
   # On deployment server
   sudo -i
   cd /opt/deployment
   git clone https://github.com/yourusername/mindmux.git
   cd mindmux
   ```

2. **Install**
   ```bash
   # Run installation script
   sudo ./deploy/scripts/install.sh v0.1.0
   ```

3. **Configure**
   ```bash
   # Update production configuration
   sudo nano /etc/mindmux/.env

   # Required variables:
   # DATABASE_URL=postgresql://...
   # REDIS_URL=redis://...
   # API_KEY_ENCRYPTION_KEY=...
   ```

4. **Start Service**
   ```bash
   # Linux
   sudo systemctl start mindmux
   sudo systemctl status mindmux

   # View logs
   sudo journalctl -u mindmux -f
   ```

5. **Verify**
   ```bash
   # Check health
   curl http://localhost:3000/health

   # Check version
   mindmux --version
   ```

6. **Monitor**
   - Watch logs for errors
   - Monitor CPU, memory, disk
   - Check metrics endpoint
   - Verify database connectivity

### Zero-Downtime Rolling Update

**Time Required:** 15 minutes
**Risk Level:** Low

#### Prerequisites

- [ ] New version tested
- [ ] Backward compatibility verified
- [ ] Database migrations tested
- [ ] Rollback plan ready

#### Steps (Single-Instance)

1. **Backup Current State**
   ```bash
   sudo ./deploy/scripts/backup.sh /backups 30
   ```

2. **Enable Drain Mode**
   ```bash
   # Prevent new tasks from starting
   mindmux config:set ENABLE_DRAIN_MODE true

   # Wait for existing tasks to complete (max 30s)
   sleep 30
   ```

3. **Update Application**
   ```bash
   # Stop service
   sudo systemctl stop mindmux

   # Update code
   cd /opt/mindmux
   git pull origin main
   npm install --production
   npm run build
   ```

4. **Run Migrations**
   ```bash
   npm run migrate -- --to latest
   ```

5. **Restart Service**
   ```bash
   sudo systemctl start mindmux

   # Wait for service to be ready
   sleep 10
   ```

6. **Disable Drain Mode**
   ```bash
   mindmux config:set ENABLE_DRAIN_MODE false
   ```

7. **Verify**
   ```bash
   # Check health
   curl http://localhost:3000/health

   # Monitor metrics
   curl http://localhost:3000/metrics | head -50
   ```

8. **Cleanup**
   ```bash
   # Old backups cleaned automatically
   # Monitor logs for issues
   sudo journalctl -u mindmux -f --lines 100
   ```

#### Rollback

If issues detected:

```bash
# Enable drain mode
mindmux config:set ENABLE_DRAIN_MODE true

# Revert to previous version
cd /opt/mindmux
git revert HEAD
npm install --production
npm run build

# Restore database if needed
sudo ./deploy/scripts/restore.sh /backups/mindmux_*.tar.gz

# Restart
sudo systemctl restart mindmux

# Disable drain mode
mindmux config:set ENABLE_DRAIN_MODE false
```

---

## Scaling

### Horizontal Scaling (Multi-Node)

**When to Scale:**
- CPU usage > 80% for 10 minutes
- Memory usage > 85%
- Database connection pool > 90%

#### Setup Load Balancer

```nginx
upstream mindmux_backend {
    least_conn;  # Load balancing strategy
    server node1:3000 max_fails=3 fail_timeout=30s;
    server node2:3000 max_fails=3 fail_timeout=30s;
    server node3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl;
    server_name mindmux.yourdomain.com;

    # Health check
    location /health {
        access_log off;
        proxy_pass http://mindmux_backend;
    }

    # API requests
    location /api {
        proxy_pass http://mindmux_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Add New Node

```bash
# On new server
ssh mindmux@node2.yourdomain.com

# Install
cd /tmp
curl -O https://github.com/yourusername/mindmux/releases/download/v0.1.0/mindmux-linux-x64
sudo ./deploy/scripts/install.sh v0.1.0

# Join cluster
sudo systemctl start mindmux
sudo mindmux cluster:join node1:3000

# Verify
mindmux cluster:status
```

### Vertical Scaling

**When to Scale:**
- Single instance at resource limits
- Traffic pattern requires larger machine

#### Steps

1. **Increase Resource Limits**
   ```bash
   # In /etc/mindmux/.env
   DATABASE_POOL_MAX=40
   REDIS_POOL_SIZE=20
   WORKER_THREADS=8
   ```

2. **Restart Service**
   ```bash
   sudo systemctl restart mindmux
   ```

3. **Monitor**
   ```bash
   watch -n 5 'curl http://localhost:3000/metrics | grep -E "mindmux_|process_"'
   ```

---

## Backup & Recovery

### Daily Backup Verification

**Frequency:** Daily
**Duration:** 5 minutes

```bash
# Run automated backup
sudo /opt/mindmux/deploy/scripts/backup.sh /backups/mindmux 30

# Verify backup integrity
cd /backups/mindmux
ls -lh mindmux_*.tar.gz | tail -3
tar -tzf mindmux_$(date +%Y%m%d)_*.tar.gz | head -10

# Check backup metadata
tar -xzOf mindmux_*.tar.gz mindmux_*/backup.json | jq .
```

### Restore Procedure

**Time Required:** 20 minutes
**Risk Level:** High (Data Loss Possible)

#### Prerequisites

- [ ] Backup file verified and accessible
- [ ] Stakeholders notified
- [ ] Staging environment ready for testing

#### Steps

1. **Validate Backup**
   ```bash
   # Check integrity
   tar -tzf /backups/mindmux/mindmux_20250119_120000.tar.gz > /dev/null

   # Extract and verify metadata
   tar -xzOf /backups/mindmux/mindmux_20250119_120000.tar.gz \
     mindmux_20250119_120000/backup.json | jq .
   ```

2. **Prepare for Restore**
   ```bash
   # Enable maintenance mode (optional)
   sudo systemctl stop mindmux

   # Verify backup file exists
   ls -lh /backups/mindmux/mindmux_20250119_120000.tar.gz
   ```

3. **Run Restore**
   ```bash
   sudo /opt/mindmux/deploy/scripts/restore.sh \
     /backups/mindmux/mindmux_20250119_120000.tar.gz \
     /var/lib/mindmux
   ```

4. **Verify Restore**
   ```bash
   # Check data integrity
   sudo -u mindmux psql mindmux_db -c "SELECT COUNT(*) FROM agents;"

   # Verify Redis
   redis-cli INFO stats | grep total_commands_processed
   ```

5. **Restart Service**
   ```bash
   sudo systemctl start mindmux
   sudo systemctl status mindmux

   # Monitor logs
   sudo journalctl -u mindmux -f
   ```

---

## Incident Response

### Critical Alert: Application Down

**Severity:** P1
**Response Time:** Immediate (< 5 minutes)

#### Diagnosis

```bash
# 1. Check service status
sudo systemctl status mindmux

# 2. Check recent logs
sudo journalctl -u mindmux -n 50

# 3. Check port
netstat -tlnp | grep 3000

# 4. Check processes
ps aux | grep mindmux

# 5. Check resources
free -h  # Memory
df -h    # Disk
top -bn1 | head -15  # CPU, memory usage
```

#### Resolution

**Option 1: Restart Service**
```bash
sudo systemctl restart mindmux
sleep 5
curl http://localhost:3000/health
```

**Option 2: Check Dependencies**
```bash
# Check database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -c "SELECT 1"

# Check Redis connectivity
redis-cli -h $REDIS_HOST ping

# Check network connectivity
netstat -an | grep ESTABLISHED | wc -l
```

**Option 3: Emergency Rollback**
```bash
# Go to previous version
cd /opt/mindmux
git log --oneline -5
git checkout <previous-tag>
npm install
npm run build
sudo systemctl restart mindmux
```

### Critical Alert: High Memory Usage

**Severity:** P2
**Response Time:** 15 minutes

#### Diagnosis

```bash
# Check memory status
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks
curl http://localhost:3000/metrics | grep memory

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity"
redis-cli INFO clients | grep connected_clients
```

#### Resolution

```bash
# 1. Identify memory consumer
# Check logs for memory-intensive operations
sudo journalctl -u mindmux -n 100 | grep -i memory

# 2. Restart service (if safe)
sudo systemctl restart mindmux

# 3. Reduce resource limits temporarily
# In /etc/mindmux/.env
# Reduce WORKER_THREADS from 8 to 4
# Reduce DATABASE_POOL_MAX from 20 to 10

sudo systemctl restart mindmux

# 4. Monitor
watch -n 5 'free -h; ps aux --sort=-%mem | head -5'
```

### Critical Alert: Database Connection Error

**Severity:** P1
**Response Time:** Immediate

#### Diagnosis

```bash
# Check database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d mindmux_db -c "SELECT 1"

# Check connection pool status
curl http://localhost:3000/metrics | grep database_connections

# Check database logs
tail -50 /var/log/postgresql/postgresql.log

# Check firewall rules
sudo iptables -L -n | grep 5432
```

#### Resolution

```bash
# 1. Verify database is running
sudo systemctl status postgresql

# 2. Check connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d mindmux_db -c "SELECT 1"

# 3. Check application configuration
grep DATABASE_URL /etc/mindmux/.env

# 4. Restart application
sudo systemctl restart mindmux

# 5. Check logs
sudo journalctl -u mindmux -n 50 | grep -i database
```

### Critical Alert: High Error Rate

**Severity:** P2
**Response Time:** 30 minutes

#### Diagnosis

```bash
# Check error rate from metrics
curl http://localhost:3000/metrics | grep errors_total

# Check application logs
sudo journalctl -u mindmux -n 100 | grep ERROR

# Analyze error distribution
sudo journalctl -u mindmux -n 1000 | grep ERROR | cut -d' ' -f5- | sort | uniq -c | sort -rn
```

#### Resolution

```bash
# 1. Identify error pattern
# 2. Check related service (database, Redis, etc.)
# 3. Review recent deployments
# 4. Consider rollback if recent deployment

# 5. Enable detailed logging temporarily
sudo systemctl stop mindmux
sudo nano /etc/mindmux/.env  # Set LOG_LEVEL=debug
sudo systemctl start mindmux

# 6. Monitor error rate
watch -n 5 'curl -s http://localhost:3000/metrics | grep errors'
```

---

## Troubleshooting

### Application won't start

```bash
# 1. Check logs for errors
sudo journalctl -u mindmux -n 100

# 2. Verify configuration
cat /etc/mindmux/.env | grep -v "^#" | grep -v "^$"

# 3. Test with verbose output
sudo -u mindmux mindmux --verbose 2>&1 | head -50

# 4. Check dependencies
npm ls 2>&1 | grep -i error
node --version  # Should be >= 24
```

### Slow response times

```bash
# 1. Check CPU usage
top -bn1 | head -15

# 2. Check database slow queries
psql -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"

# 3. Check Redis latency
redis-cli --latency

# 4. Analyze metrics
curl http://localhost:3000/metrics | grep duration | sort | tail -10
```

### Disk space issues

```bash
# Check disk usage
df -h /

# Find large files
du -sh /var/log/mindmux/*
du -sh /var/lib/mindmux/*

# Clean old logs
sudo journalctl --vacuum=1G

# Clean old backups
find /backups -name "*.tar.gz" -mtime +30 -delete

# Database cleanup
psql -c "VACUUM ANALYZE;"
redis-cli BGSAVE
```

### Network connectivity issues

```bash
# Check network interfaces
ip link show
ip addr show

# Check DNS resolution
nslookup mindmux.yourdomain.com
dig mindmux.yourdomain.com

# Check firewall
sudo iptables -L -n
sudo ufw status verbose

# Check port binding
netstat -tlnp | grep 3000
```

---

## Contact & Escalation

- **On-Call Engineer:** Check PagerDuty
- **Manager:** Escalate if critical and > 30 min unresolved
- **Security Team:** For security incidents
- **External:** Contact support@yourdomain.com

---

Last Updated: 2025-01-19
