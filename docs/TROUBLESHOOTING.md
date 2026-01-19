# MindMux Troubleshooting Guide

Common issues and solutions.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Agent Management](#agent-management)
3. [Configuration Problems](#configuration-problems)
4. [tmux Issues](#tmux-issues)
5. [Performance Issues](#performance-issues)
6. [API Issues](#api-issues)
7. [Debugging](#debugging)

## Installation Issues

### Issue: Command not found: mux

**Symptoms:**
```
bash: mux: command not found
```

**Causes:**
- MindMux not installed
- Installation directory not in PATH
- Global install not completed

**Solutions:**

1. Check if installed:
```bash
npm list -g mindmux
```

2. Install globally:
```bash
npm install -g mindmux
```

3. Or build and link locally:
```bash
cd mindmux
npm install
npm run build
npm link
```

4. Verify installation:
```bash
which mux
mux --version
```

### Issue: Node.js version too old

**Symptoms:**
```
Error: MindMux requires Node.js 20+
```

**Solution:**

Update Node.js:

```bash
# Using nvm
nvm install 20
nvm use 20

# Using homebrew
brew upgrade node

# Verify version
node --version
```

### Issue: tmux not found

**Symptoms:**
```
Error: tmux not found in PATH
```

**Solutions:**

**macOS:**
```bash
brew install tmux
tmux -V
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tmux
tmux -V
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install tmux
tmux -V
```

**WSL:**
```bash
sudo apt-get install tmux
tmux -V
```

### Issue: Permission denied installing globally

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solution:**

Use `sudo` with npm:

```bash
sudo npm install -g mindmux
```

Or configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g mindmux
```

## Agent Management

### Issue: Agent fails to start

**Symptoms:**
```
Agent status: error
```

**Diagnose:**

1. Check agent status:
```bash
mux agent:status {agent-name}
```

2. View logs:
```bash
mux agent:logs {agent-name} --lines 50
```

3. Check for common issues:
```bash
# API key not set
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."

# Or add to config
mux config:show
```

**Solutions:**

1. **API key not configured:**
```bash
# Set environment variable
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."

# Or update config
echo '{"apiKeys":{"claude":"sk-ant-..."}}' >> ~/.mindmux/config.json
```

2. **Invalid capability:**
```bash
# Check valid capabilities
mux agent:create {name} --type claude --help

# Valid: code-generation, code-review, debugging, testing, documentation, planning, research, refactoring
```

3. **Tmux session failed:**
```bash
# Check tmux
tmux list-sessions

# Kill stuck sessions
tmux kill-session -t mindmux-{agent-id}

# Restart agent
mux agent:start {agent-name}
```

### Issue: Agent appears but can't connect

**Symptoms:**
```
Agent listed but status is 'error' or unreachable
```

**Solution:**

1. Check tmux session exists:
```bash
tmux list-sessions | grep mindmux
```

2. Manually attach and check for errors:
```bash
tmux attach -t mindmux-{agent-id}
```

3. If hung, kill and restart:
```bash
tmux kill-session -t mindmux-{agent-id}
mux agent:start {agent-name}
```

### Issue: Agent deleted but logs remain

**Symptoms:**
```
Agent logs still visible after deletion
```

**Solution:**

Manually clean up logs:

```bash
rm -rf ~/.mindmux/logs/agents/{agent-id}.log*
```

## Configuration Problems

### Issue: Configuration not loading

**Symptoms:**
```
Config not applying changes
```

**Solutions:**

1. Verify config file exists:
```bash
mux config:show
```

2. Check file is valid JSON:
```bash
cat ~/.mindmux/config.json | jq .
```

3. Check hierarchy (environment > project > global > defaults):
```bash
# Check environment variables
env | grep MINDMUX_

# Check project config
cat ./.mindmux/config.json

# Check global config
cat ~/.mindmux/config.json
```

4. Reload configuration:
```bash
# Delete cache
rm -rf ~/.mindmux/cache/

# Re-run command
mux config:show
```

### Issue: Invalid configuration causes errors

**Symptoms:**
```
Error: Invalid configuration
  timeout must be a positive number
```

**Solution:**

1. Identify invalid setting:
```bash
cat ~/.mindmux/config.json | jq .
```

2. Fix the value:
```json
{
  "timeout": 3600000,
  "maxConcurrentAgents": 10
}
```

3. Validate after fixing:
```bash
mux config:show
```

### Issue: Configuration not persisting

**Symptoms:**
```
Config changes lost after restart
```

**Solution:**

Ensure config file is writable:

```bash
# Check permissions
ls -la ~/.mindmux/config.json

# Fix permissions if needed
chmod 644 ~/.mindmux/config.json
```

## tmux Issues

### Issue: tmux session orphaned

**Symptoms:**
```
Agent running but can't attach
```

**Solutions:**

1. List sessions:
```bash
tmux list-sessions
```

2. Check if session exists:
```bash
tmux list-sessions | grep mindmux-{agent-id}
```

3. Kill and recreate:
```bash
tmux kill-session -t mindmux-{agent-id}
mux agent:start {agent-name}
```

### Issue: tmux window too small for output

**Symptoms:**
```
Log output truncated or wrapped
```

**Solution:**

Resize tmux window:

```bash
# Attach to session
tmux attach -t mindmux-{agent-id}

# Resize manually in tmux
# Or set window size
tmux set-window-option -t mindmux-{agent-id} -e 'aggressive-resize' on
```

### Issue: Can't detach from tmux session

**Symptoms:**
```
Stuck in tmux session, can't exit
```

**Solution:**

Use tmux keyboard shortcut to detach:

```
Ctrl+B D
```

Or kill session if necessary:

```bash
tmux kill-session -t mindmux-{agent-id}
```

### Issue: Multiple agents in same tmux session

**Symptoms:**
```
Agents interfering with each other's output
```

**Solution:**

Each agent should have its own session. Check configuration:

```bash
mux config:show --json | jq '.tmux'
```

Ensure `sessionPrefix` is unique per environment.

## Performance Issues

### Issue: Slow agent startup

**Symptoms:**
```
Agent takes >5 seconds to start
```

**Solutions:**

1. Check system load:
```bash
uptime
top
```

2. Check disk usage:
```bash
df -h ~/.mindmux
du -sh ~/.mindmux/logs
```

3. Reduce concurrent agents:
```json
{
  "maxConcurrentAgents": 5
}
```

4. Archive old logs:
```bash
# Delete logs older than 30 days
find ~/.mindmux/logs -name "*.log.*" -mtime +30 -delete
```

### Issue: High memory usage

**Symptoms:**
```
MindMux using >1GB memory
```

**Solutions:**

1. Check process memory:
```bash
ps aux | grep mindmux
top -p $(pgrep -f mindmux)
```

2. Reduce maximum concurrent agents:
```json
{
  "maxConcurrentAgents": 3
}
```

3. Reduce max log size:
```json
{
  "logging": {
    "maxLogSizeMB": 50
  }
}
```

4. Disable agent logs if not needed:
```json
{
  "logging": {
    "enableAgentLogs": false
  }
}
```

### Issue: Slow list operations

**Symptoms:**
```
mux agent:list takes >1 second with many agents
```

**Solution:**

1. Reduce listed agents:
```bash
mux agent:list --status idle
```

2. Check disk I/O:
```bash
iostat -x 1
```

3. Increase system limits:
```bash
ulimit -n 65536
```

## API Issues

### Issue: API endpoint not responding

**Symptoms:**
```
curl: (7) Failed to connect
```

**Solutions:**

1. Check if service running:
```bash
sudo systemctl status mindmux
```

2. Check if listening on port 8080:
```bash
lsof -i :8080
```

3. Start service:
```bash
sudo systemctl start mindmux
```

4. Check firewall:
```bash
sudo ufw status
sudo ufw allow 8080
```

### Issue: API returns 500 error

**Symptoms:**
```
{
  "status": "error",
  "error": {
    "code": "SERVICE_ERROR"
  }
}
```

**Solutions:**

1. Check service logs:
```bash
sudo journalctl -u mindmux -n 50
```

2. Enable debug logging:
```bash
export MINDMUX_LOGGING_LEVEL=debug
sudo systemctl restart mindmux
```

3. Check database connection (when applicable)

## Debugging

### Enable Debug Logging

```bash
# Set log level
export MINDMUX_LOGGING_LEVEL=debug

# Run command
mux agent:list

# View logs
cat ~/.mindmux/logs/mindmux.log
```

### Debug with Node Inspector

```bash
# Run with debugger
node --inspect-brk dist/cli.js agent:list

# Open Chrome DevTools
# chrome://inspect
```

### Check All Configurations

```bash
# Show merged configuration
mux config:show

# Show as JSON
mux config:show --json

# Check environment
env | grep MINDMUX_
```

### Collect Diagnostic Information

```bash
# System info
uname -a
node --version
npm --version
tmux -V

# MindMux info
mux --version
mux config:show

# List all agents
mux agent:list --verbose

# Check logs
ls -lah ~/.mindmux/logs/

# Disk usage
du -sh ~/.mindmux/

# Process info
ps aux | grep -i mindmux
```

### Generate Support Bundle

```bash
# Create diagnostic bundle
tar -czf mindmux-support-$(date +%Y%m%d-%H%M%S).tar.gz \
  ~/.mindmux/config.json \
  ~/.mindmux/agents.json \
  ~/.mindmux/logs/ \
  ~/.mindmux/metadata.json

# Include system info
{
  echo "System: $(uname -a)"
  echo "Node: $(node --version)"
  echo "NPM: $(npm --version)"
  echo "tmux: $(tmux -V)"
  echo ""
  echo "MindMux Config:"
  mux config:show --json
} >> mindmux-support-$(date +%Y%m%d-%H%M%S).txt
```

## Getting Help

### When to check docs:

1. **Installation**: [GETTING_STARTED.md](./GETTING_STARTED.md)
2. **Usage**: [USER_GUIDE.md](./USER_GUIDE.md)
3. **Configuration**: [CONFIGURATION.md](./CONFIGURATION.md)
4. **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
5. **Development**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

### Open an Issue

Include when reporting issues:

1. Your system: `uname -a`
2. MindMux version: `mux --version`
3. Node version: `node --version`
4. Error message (full output)
5. Steps to reproduce
6. Relevant config (redact secrets)
7. System resources: `top`, `df`, `free -h`

### Common Questions

**Q: How do I reset MindMux?**

A: Delete configuration and data:
```bash
rm -rf ~/.mindmux/
```

**Q: Can I use MindMux without tmux?**

A: Not currently. tmux provides session persistence. Future: Support for other backends.

**Q: Where are my agent logs stored?**

A: `~/.mindmux/logs/agents/{agent-id}.log`

**Q: How do I backup my agents?**

A: Backup `~/.mindmux/agents.json`:
```bash
cp ~/.mindmux/agents.json ~/.mindmux/agents.json.backup
```

**Q: Can I run multiple MindMux instances?**

A: Yes, use different `sessionPrefix` in config or `.mindmux/config.json`

---

Still stuck? Check [GETTING_STARTED.md](./GETTING_STARTED.md) or open a GitHub issue with diagnostic information.
