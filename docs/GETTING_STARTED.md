# Getting Started with MindMux

Get MindMux up and running in under 10 minutes.

## Prerequisites

Before installing MindMux, ensure you have:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **tmux 3.0+** - Terminal multiplexer for agent sessions
- **npm** (comes with Node.js)

### Check Prerequisites

```bash
node --version  # Should show v20.0.0 or higher
npm --version
tmux -V         # Should show tmux 3.0.0 or higher
```

### Install tmux

**macOS:**
```bash
brew install tmux
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tmux
```

**WSL (Windows Subsystem for Linux):**
```bash
sudo apt-get install tmux
```

**Verify installation:**
```bash
tmux -V
```

## Installation

### Option 1: Clone from GitHub (Development)

```bash
git clone https://github.com/yourusername/mindmux.git
cd mindmux
npm install
npm run build
npm link  # Install globally as 'mux' command
```

### Option 2: From npm (When Published)

```bash
npm install -g mindmux
```

Verify installation:
```bash
mux --version
mux --help
```

## Configuration

MindMux stores configuration in `~/.mindmux/` directory.

### Initial Setup

The first time you run MindMux, it creates the configuration directory:

```bash
mux agent:list  # Creates ~/.mindmux/ if it doesn't exist
```

### Configure API Keys

Create `~/.mindmux/config.json` with your API keys:

```json
{
  "version": "0.1.0",
  "defaultAgentType": "claude",
  "apiKeys": {
    "claude": "sk-ant-...",
    "gemini": "AIza...",
    "gpt4": "sk-..."
  },
  "logging": {
    "level": "info"
  }
}
```

**Never commit this file to git!** Use environment variables instead:

```bash
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
export MINDMUX_GEMINI_API_KEY="AIza..."
export MINDMUX_GPT4_API_KEY="sk-..."
```

See [CONFIGURATION.md](./CONFIGURATION.md) for all options.

## Quick Start

### 1. Create Your First Agent

```bash
mux agent:create my-dev-agent --type claude --capabilities code-generation,code-review
```

Output:
```
✓ Agent created: my-dev-agent
  ID: a1b2c3d4
  Type: claude
  Capabilities: code-generation, code-review
```

### 2. List Agents

```bash
mux agent:list
```

Output:
```
Name           Type    Status  Capabilities
my-dev-agent   claude  idle    code-generation, code-review
```

### 3. Start the Agent

```bash
mux agent:start my-dev-agent
```

The agent runs in a tmux session in the background.

### 4. View Logs

```bash
mux agent:logs my-dev-agent --follow
```

Or attach directly to the tmux session:
```bash
tmux attach -t mindmux-a1b2c3d4
```

### 5. Check Status

```bash
mux agent:status my-dev-agent
```

### 6. Stop the Agent

```bash
mux agent:stop my-dev-agent
```

## Common Workflows

### Create Multiple Agents for a Project

```bash
# Code generation agent
mux agent:create code-gen --type claude --capabilities code-generation

# Code review agent
mux agent:create reviewer --type claude --capabilities code-review

# Testing agent
mux agent:create tester --type gemini --capabilities testing

# List all agents
mux agent:list
```

### Create Agent from Configuration File

Create `agent-config.json`:
```json
{
  "name": "ml-expert",
  "type": "claude",
  "model": "claude-opus-4-5-20250929",
  "capabilities": ["research", "debugging", "documentation"]
}
```

Create agent:
```bash
mux agent:create ml-expert --config agent-config.json
```

### View Configuration

```bash
# Show merged configuration (project > global > defaults)
mux config:show

# Show as JSON
mux config:show --json
```

## Troubleshooting

### Command not found: mux

If you get "command not found: mux", either:

1. Ensure Node.js 20+ is installed: `node --version`
2. Run `npm link` from the mindmux directory
3. Or use `npx mindmux` instead of `mux`

### tmux: command not found

Install tmux for your OS (see [Install tmux](#install-tmux) section).

### Agent fails to start

Check the logs:
```bash
mux agent:logs {agent-name} --lines 50
```

Common issues:
- API key not set (see [Configure API Keys](#configure-api-keys))
- tmux not installed or not in PATH
- Insufficient disk space for logs

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Next Steps

1. **[USER_GUIDE.md](./USER_GUIDE.md)** - Detailed feature guides
2. **[CONFIGURATION.md](./CONFIGURATION.md)** - All configuration options
3. **[API.md](./API.md)** - REST API reference

## Getting Help

- **Command help**: `mux --help` or `mux {command} --help`
- **View logs**: `mux agent:logs {agent-name} --lines 100`
- **Documentation**: [All docs](./README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/mindmux/issues)

---

**Ready?** Run your first agent with:
```bash
mux agent:create my-first-agent --type claude --capabilities code-generation
mux agent:start my-first-agent
mux agent:logs my-first-agent --follow
```
