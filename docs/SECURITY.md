# MindMux Security Documentation

Security model, best practices, and threat mitigation.

## Overview

MindMux handles sensitive information (API keys, agent configurations) and must follow security best practices.

## Security Principles

1. **Least Privilege** - Agents get only required capabilities
2. **Encryption** - Sensitive data encrypted at rest (future)
3. **Isolation** - Agents isolated in separate tmux sessions
4. **Audit Trail** - All operations logged for review
5. **Secure Defaults** - Start with restricted access, expand as needed

## API Keys and Secrets Management

### Best Practice: Environment Variables

Never store API keys in files checked into git:

```bash
# ✗ Don't do this (commits key to git)
cat > config.json << 'EOF'
{
  "apiKeys": {
    "claude": "sk-ant-..."
  }
}
EOF
git add config.json

# ✓ Use environment variables instead
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
```

### Setting API Keys

**Option 1: Environment Variables (Recommended)**

```bash
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
export MINDMUX_GEMINI_API_KEY="AIza..."
export MINDMUX_GPT4_API_KEY="sk-..."
```

Secure in:
- GitHub Actions secrets
- CI/CD environment
- `.bashrc` (local development only, gitignore)

**Option 2: .env File (Development Only)**

Create `.env` (add to `.gitignore`):

```bash
MINDMUX_CLAUDE_API_KEY=sk-ant-...
MINDMUX_GEMINI_API_KEY=AIza...
```

Load before running:

```bash
source .env
mux agent:list
```

**Option 3: Config File (Not Recommended)**

If you must use config file, secure it strictly:

```bash
# Create config with restricted permissions
touch ~/.mindmux/config.json
chmod 600 ~/.mindmux/config.json

# Add keys (be careful!)
echo '{"apiKeys":{"claude":"sk-ant-..."}}' >> ~/.mindmux/config.json
```

File permissions: **Must be 600** (owner read/write only)

```bash
# Check permissions
ls -la ~/.mindmux/config.json
-rw------- 1 user group 1234 Jan 19 10:00 ~/.mindmux/config.json
```

### Key Rotation

Rotate API keys periodically:

```bash
# Remove old key
unset MINDMUX_CLAUDE_API_KEY

# Set new key
export MINDMUX_CLAUDE_API_KEY="sk-ant-{new-key}"

# Test
mux agent:list

# Update in GitHub Actions, CI/CD, etc.
```

## File Permissions

### Configuration Directory

Restrict access to configuration:

```bash
# Owner read/write only
chmod 700 ~/.mindmux

# Config file: owner read/write only
chmod 600 ~/.mindmux/config.json

# Agents file: owner read/write only
chmod 600 ~/.mindmux/agents.json

# Verify
ls -la ~/.mindmux/
drwx------ user user .mindmux
-rw------- user user config.json
-rw------- user user agents.json
```

### Project Configuration

In version-controlled projects:

```bash
# Project config (not sensitive)
chmod 644 .mindmux/config.json

# Add to .gitignore if contains secrets
echo ".mindmux/config-local.json" >> .gitignore
```

## Agent Isolation

Each agent runs in isolated tmux session:

- Session name: `mindmux-{agent-id}`
- Each session independent
- No inter-agent communication (Phase 1-4)
- One agent crash doesn't affect others

Check agent processes:

```bash
# See all MindMux processes
ps aux | grep mindmux

# Or by session
tmux list-sessions
```

## Logging and Monitoring

### What Gets Logged

- Agent creation/deletion
- Agent start/stop events
- Command execution
- Errors and exceptions

### What's NOT Logged

- API keys (never)
- Agent input/output (configurable)
- Sensitive credentials

### Log Access Control

```bash
# Check log file permissions
ls -la ~/.mindmux/logs/mindmux.log
-rw------- user user mindmux.log

# Ensure owner-only access
chmod 600 ~/.mindmux/logs/mindmux.log
chmod 700 ~/.mindmux/logs
```

### Log Retention

Set log rotation:

```json
{
  "logging": {
    "maxLogSizeMB": 100,
    "format": "json"
  }
}
```

Manual cleanup:

```bash
# Delete old logs
find ~/.mindmux/logs -name "*.log.*" -mtime +30 -delete

# Or archive
tar -czf logs-backup.tar.gz ~/.mindmux/logs/
```

## Authentication (Future)

### Planned (Phase 6+)

- Token-based API authentication
- OAuth for provider APIs
- Multi-user support with RBAC
- API rate limiting

Current (Phase 1-4): No authentication (single-user CLI)

## Data Security

### Encryption at Rest (Future)

Planned improvements:

- Encrypt sensitive config values
- Encrypt agent logs
- Secure key storage

### Data In Transit

Currently: HTTP (development). Future: HTTPS/TLS for API.

### Sensitive Data in Memory

API keys:

- Loaded on demand from environment/config
- Stored in memory only during operation
- Never logged or exposed in output

## Threat Mitigation

| Threat | Probability | Impact | Mitigation |
|--------|-------------|--------|-----------|
| API key leaked in git | High | Critical | Use env vars, add to .gitignore, pre-commit hooks |
| Unauthorized agent execution | Low | High | File permissions (mode 700 for ~/.mindmux) |
| Agent crash/hang | Medium | Medium | Restart capability, tmux isolation |
| Log file leak | Medium | Medium | Set log permissions (mode 600), audit access |
| Config file tampering | Low | High | Verify file integrity, use version control |

## Security Best Practices

### For Developers

1. **Never commit secrets**:
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   echo ".mindmux/" >> .gitignore
   ```

2. **Use strong secrets**:
   - Generate: `openssl rand -base64 32`
   - Store securely (1Password, Vault, GitHub Secrets)

3. **Audit agent access**:
   ```bash
   # Review agent capabilities
   mux agent:list --verbose
   ```

4. **Rotate secrets periodically**:
   - Monthly or when team member leaves
   - After suspected compromise

### For Operators

1. **Restrict directory permissions**:
   ```bash
   chmod 700 ~/.mindmux
   chmod 600 ~/.mindmux/*.json
   ```

2. **Monitor access**:
   ```bash
   # Watch logs for errors
   tail -f ~/.mindmux/logs/mindmux.log

   # Check for unauthorized access
   grep "ERROR\|WARN" ~/.mindmux/logs/mindmux.log
   ```

3. **Backup securely**:
   ```bash
   # Encrypt backup
   tar -czf - ~/.mindmux | gpg --encrypt > backup.tar.gz.gpg
   ```

4. **Use environment variables**:
   ```bash
   # In systemd service or CI/CD
   Environment="MINDMUX_CLAUDE_API_KEY=${CLAUDE_KEY}"
   ```

## Compliance

### Data Protection

- GDPR: No personal data collection (future compliance)
- HIPAA: Not currently compliant (no encryption)
- SOC2: Planned for enterprise deployment

### Audit Trail

Audit what activities:

```bash
# Enable debug logging
export MINDMUX_LOGGING_LEVEL=debug

# Check all operations
grep "agent" ~/.mindmux/logs/mindmux.log
```

### Incident Response

If compromise suspected:

1. Rotate all API keys immediately:
   ```bash
   # Update providers (Claude, Gemini, etc.)
   ```

2. Review logs for unauthorized access:
   ```bash
   grep -E "start|delete|update" ~/.mindmux/logs/mindmux.log
   ```

3. Restart service cleanly:
   ```bash
   mux agent:stop --all
   rm -rf ~/.mindmux/
   # Reconfigure from secure backup
   ```

4. Audit git history:
   ```bash
   git log --grep="config\|secret\|key" --oneline
   ```

## Security Checklist

Before deploying to production:

- [ ] API keys in environment variables, not files
- [ ] Config directory permissions: 700
- [ ] Config files permissions: 600
- [ ] Log files permissions: 600
- [ ] Secrets not in git history
- [ ] .gitignore includes .env, .mindmux/
- [ ] Regular backups (encrypted)
- [ ] Logging enabled and monitored
- [ ] Service runs as unprivileged user
- [ ] Firewall restricts API access
- [ ] Regular security audits planned

## Reporting Security Issues

Found a vulnerability? **Don't open public issue.**

1. Email: security@mindmux.dev (when available)
2. Or file private GitHub security advisory
3. Include: description, steps to reproduce, impact
4. Allow 90 days for fix before public disclosure

## Security Resources

- [OWASP Security Best Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security](https://nodejs.org/en/docs/guides/nodejs-security/)
- [API Key Management](https://cloud.google.com/docs/authentication/api-keys)

---

For questions, see [FAQ.md](./FAQ.md) or [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Stay secure!**
