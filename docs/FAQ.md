# MindMux FAQ

Frequently asked questions and answers.

## Installation & Setup

### Q: What are the system requirements?

**A:**
- Node.js 20 or higher
- tmux 3.0 or higher
- 2GB RAM minimum (4GB+ recommended)
- 1GB disk space for config and logs
- Works on Linux, macOS, and Windows (WSL)

### Q: Can I use MindMux on Windows?

**A:**
Yes, but you'll need Windows Subsystem for Linux (WSL):

1. Enable WSL: `wsl --install`
2. Install Ubuntu: `wsl --install -d Ubuntu`
3. Install Node.js and tmux in WSL
4. Use MindMux normally in WSL terminal

Alternative: Use Docker on Windows.

### Q: Do I need to install MindMux globally?

**A:**
No, but it's recommended for convenience. You can also:

```bash
# Use npx
npx mindmux agent:list

# Or build and use locally
npm run build
node dist/cli.js agent:list
```

## Configuration

### Q: Where is my configuration stored?

**A:**
- **Global config**: `~/.mindmux/config.json`
- **Project config**: `./.mindmux/config.json` (in project root)
- **API keys**: Set via environment variables (`MINDMUX_CLAUDE_API_KEY`, etc.)

Never store API keys in version control files.

### Q: How do I override global configuration for a specific project?

**A:**
Create `.mindmux/config.json` in your project root:

```bash
mkdir -p .mindmux
echo '{
  "maxConcurrentAgents": 3,
  "timeout": 1800000
}' > .mindmux/config.json
```

This overrides global settings for only this project.

### Q: Can I use environment variables for configuration?

**A:**
Yes! Set any config option as an environment variable:

```bash
export MINDMUX_DEFAULT_AGENT_TYPE="gemini"
export MINDMUX_MAX_CONCURRENT_AGENTS="5"
export MINDMUX_LOGGING_LEVEL="debug"
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
```

Environment variables take highest priority.

## Agents

### Q: How many agents can I run simultaneously?

**A:**
Default is 10, but it's configurable:

```json
{
  "maxConcurrentAgents": 20
}
```

Limit depends on system resources (CPU, memory, network).

### Q: Can I rename an agent?

**A:**
No, agent names are immutable. Instead:

1. Note agent ID: `mux agent:list --verbose`
2. Delete agent: `mux agent:delete {name} --yes`
3. Create new agent with new name: `mux agent:create {new-name} --type ...`

Agent data (logs, history) is deleted with the agent.

### Q: What happens when an agent crashes?

**A:**
The agent's tmux session persists. Check what happened:

```bash
mux agent:logs {name} --lines 100
mux agent:status {name}
```

Then either:
- Manually fix the issue and restart
- Kill the session and restart: `mux agent:stop {name} --force`

### Q: Can agents communicate with each other?

**A:**
Not yet. Currently, agents run independently. Future phases will add task orchestration for multi-agent workflows.

## Capabilities

### Q: What's the difference between capabilities?

**A:**
Capabilities indicate what an agent can do. For example:

- `code-generation` - Generate code from specifications
- `code-review` - Review and analyze code quality
- `testing` - Write and run tests
- `debugging` - Debug and troubleshoot issues
- `documentation` - Generate or improve documentation
- `planning` - Create implementation plans
- `research` - Research technical topics
- `refactoring` - Improve code structure

Not all agent types support all capabilities.

### Q: Can I change capabilities after creating an agent?

**A:**
Yes, update an agent's capabilities:

```bash
mux agent:update {name} --capabilities code-generation,testing
```

### Q: Can I create an agent without specifying capabilities?

**A:**
Yes, but the agent is less useful. Capabilities help route work to appropriate agents:

```bash
mux agent:create {name} --type claude
# Creates agent with no specific capabilities
```

Better to assign capabilities:

```bash
mux agent:create {name} --type claude --capabilities code-generation,code-review
```

## Sessions and Logs

### Q: Where are agent logs stored?

**A:**
Per-agent logs in: `~/.mindmux/logs/agents/{agent-id}.log`

View logs:

```bash
# Last 50 lines
mux agent:logs {name} --lines 50

# Follow live
mux agent:logs {name} --follow

# Get all logs
mux agent:logs {name} --all
```

### Q: How do I view a running agent's tmux session?

**A:**
Attach directly to the tmux session:

```bash
# Find agent ID
mux agent:list --verbose

# Attach to session
tmux attach -t mindmux-{agent-id}
```

Press `Ctrl+B D` to detach without killing the session.

### Q: Are logs persistent after the CLI exits?

**A:**
Yes! Logs are written to disk. Agent sessions (tmux) also persist.

To permanently stop an agent:

```bash
mux agent:stop {name}
```

### Q: How do I clear old logs?

**A:**
Logs are never auto-deleted (intentional for debugging). Manually remove:

```bash
# Delete specific agent logs
rm ~/.mindmux/logs/agents/{agent-id}.log*

# Delete rotated logs older than 30 days
find ~/.mindmux/logs -name "*.log.*" -mtime +30 -delete
```

Configure max log size:

```json
{
  "logging": {
    "maxLogSizeMB": 100
  }
}
```

When a log exceeds this size, it rotates to `.log.1`, `.log.2`, etc.

## API and Integration

### Q: Is there a REST API?

**A:**
Basic API endpoints are available (health, status, agents). Full server coming in Phase 6.

Current endpoints:

- `GET /health` - Health check
- `GET /status` - System status
- `GET /agents` - List agents
- `GET /agents/{id}` - Get agent details
- `GET /events` - Stream events (SSE)

See [API.md](./API.md) for details.

### Q: Can I integrate MindMux with CI/CD?

**A:**
Not yet, but it's planned. For now, you can:

1. Use the CLI in scripts:
```bash
#!/bin/bash
mux agent:create ci-agent --type claude --capabilities code-review
mux agent:start ci-agent
# Do work
mux agent:stop ci-agent
```

2. Read agent status from files:
```bash
cat ~/.mindmux/agents.json | jq '.[] | select(.name == "ci-agent")'
```

## Performance

### Q: Why is MindMux slow on startup?

**A:**
First startup creates configuration directory and files. Subsequent runs are faster.

To optimize:

1. Reduce number of agents
2. Archive old logs: `find ~/.mindmux/logs -name "*.log.*" -mtime +30 -delete`
3. Use SSD instead of rotating disk
4. Check system load: `uptime`

### Q: Why is my agent taking so long to respond?

**A:**
Possible causes:

1. **Network latency**: Check internet connection
2. **API rate limiting**: Provider may be throttling requests
3. **System load**: Run `top` and check if CPU/memory full
4. **Model overload**: Try a different model or provider
5. **Task complexity**: Some tasks just take longer

Check logs:

```bash
mux agent:logs {name} --follow
```

### Q: How much disk space do logs use?

**A:**
Depends on activity, but logs can grow quickly. Monitor:

```bash
du -sh ~/.mindmux/logs
ls -lh ~/.mindmux/logs/agents/
```

Rotate logs manually:

```bash
find ~/.mindmux/logs -name "*.log" -exec gzip {} \;
```

## Troubleshooting

### Q: My agent won't start. What should I do?

**A:**
1. Check status: `mux agent:status {name}`
2. View logs: `mux agent:logs {name} --lines 50`
3. Common issues:
   - API key not set (see Configuration section)
   - tmux session hung: `mux agent:stop {name} --force`
   - Insufficient resources: Check `free -h` and `df -h`

### Q: How do I reset MindMux completely?

**A:**
Delete all configuration:

```bash
rm -rf ~/.mindmux/
```

MindMux will recreate with defaults on next run.

### Q: Why can't I uninstall MindMux?

**A:**
To uninstall globally:

```bash
npm uninstall -g mindmux
```

Then remove configuration:

```bash
rm -rf ~/.mindmux/
```

## Advanced

### Q: Can I run multiple MindMux instances?

**A:**
Yes, with different tmux session prefixes:

**Instance 1** (`.mindmux/config.json`):
```json
{
  "tmux": {
    "sessionPrefix": "mux1"
  }
}
```

**Instance 2** (`.mindmux/config.json`):
```json
{
  "tmux": {
    "sessionPrefix": "mux2"
  }
}
```

Sessions won't conflict.

### Q: Can I extend MindMux with custom providers?

**A:**
Not yet. Currently supports: Claude, Gemini, GPT-4, OpenCode.

Adding custom providers is planned for Phase 7+.

### Q: Is MindMux open source?

**A:**
Yes! Licensed under MIT. Contributions welcome:

1. Fork repository
2. Create feature branch
3. Make changes and add tests
4. Submit pull request

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for details.

### Q: What's the roadmap?

**A:**
See [ROADMAP.md](./ROADMAP.md) or [../README.md](../README.md#roadmap) for planned features by phase.

Current: Phase 1-4 complete. Phase 5+ in progress.

## Still Have Questions?

- **Documentation**: Read the [docs](./README.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Issues**: Open [GitHub issue](https://github.com/yourusername/mindmux/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/yourusername/mindmux/discussions)

---

**Something not covered?** Open an issue or discussion!
