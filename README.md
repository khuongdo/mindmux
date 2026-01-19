# MindMux

Multi-Agent AI CLI for orchestrating AI agents in development workflows.

## Overview

MindMux is a command-line tool for managing and orchestrating multiple AI agents (Claude, Gemini, GPT-4, OpenCode) to work together on complex development tasks. It provides a unified interface for creating, managing, and coordinating AI agents with different capabilities.

## Features

- **Multi-Agent Management**: Create and manage multiple AI agents with different capabilities
- **Agent Types**: Support for Claude, Gemini, GPT-4, and OpenCode
- **Session Management**: Isolated tmux sessions for each agent with persistence
- **Real-time Logs**: View and follow agent output in real-time
- **Configuration Hierarchy**: Project-local configs override global settings
- **Capabilities System**: Assign specific capabilities (code-generation, code-review, debugging, testing, etc.)
- **Status Tracking**: Monitor agent status and activity
- **Session Recovery**: Automatic cleanup of orphaned sessions on startup
- **Cross-Platform**: Works on Linux, macOS, and Windows (WSL)

## Prerequisites

- **Node.js 20+**: Required for TypeScript and CLI
- **tmux 3.0+**: Required for agent session management

### Install tmux

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt install tmux

# WSL
sudo apt install tmux

# Verify installation
tmux -V
```

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/mindmux.git
cd mindmux

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link CLI globally (optional)
npm link
```

## Quick Start

### Create an Agent

```bash
# Create a Claude agent for code generation and review
mux agent:create my-dev-agent --type claude --capabilities code-generation,code-review

# Create a Gemini agent for testing
mux agent:create test-bot --type gemini --capabilities testing,debugging

# Create with custom model
mux agent:create gpt-helper --type gpt4 --model gpt-4-turbo --capabilities documentation
```

### List Agents

```bash
# Simple table view
mux agent:list

# Detailed view
mux agent:list --verbose
```

### View Agent Status

```bash
# By name or ID
mux agent:status my-dev-agent
```

### Delete Agent

```bash
# With confirmation prompt
mux agent:delete my-dev-agent

# Skip confirmation
mux agent:delete my-dev-agent --yes
```

### Start Agent

```bash
# Start agent in tmux session
mux agent:start my-dev-agent

# Agent runs in isolated tmux session
# Session persists after CLI exits
```

### Stop Agent

```bash
# Graceful shutdown
mux agent:stop my-dev-agent

# Force kill
mux agent:stop my-dev-agent --force
```

### View Agent Logs

```bash
# View last 100 lines
mux agent:logs my-dev-agent

# View last 500 lines
mux agent:logs my-dev-agent --lines 500

# Follow live output (like tail -f)
mux agent:logs my-dev-agent --follow

# Attach directly to tmux session
tmux attach -t mindmux-{agent-id}
```

### View Configuration

```bash
# Show merged configuration (project-local > global > defaults)
mux config:show
```

## Configuration

### Global Configuration

Global configuration is stored in `~/.mindmux/config.json`:

```json
{
  "version": "0.1.0",
  "defaultAgentType": "claude",
  "defaultModel": {
    "claude": "claude-opus-4-5-20250929",
    "gemini": "gemini-2-5-flash",
    "gpt4": "gpt-4-turbo",
    "opencode": "opencode-latest"
  },
  "timeout": 3600000,
  "maxConcurrentAgents": 10,
  "logging": {
    "level": "info",
    "enableAgentLogs": true,
    "maxLogSizeMB": 100
  },
  "tmux": {
    "sessionPrefix": "mindmux",
    "keepSessionsAlive": true
  }
}
```

### Project-Local Configuration

Create `.mindmux/config.json` in your project to override global settings:

```json
{
  "timeout": 1800000,
  "maxConcurrentAgents": 5
}
```

### Configuration Hierarchy

1. **Project-local** (`./.mindmux/config.json`) - highest priority
2. **Global** (`~/.mindmux/config.json`) - fallback
3. **Defaults** - hardcoded defaults

## Directory Structure

```
~/.mindmux/
├── config.json              # Global settings
├── agents.json              # Agent definitions
├── metadata.json            # CLI metadata
├── logs/                    # Log files
│   └── agents/              # Per-agent logs
├── cache/                   # Temporary cache
│   └── sessions/            # Session state
└── .gitignore               # Ignore sensitive files
```

## Agent Capabilities

Valid capabilities:
- `code-generation` - Generate code from specifications
- `code-review` - Review and analyze code quality
- `debugging` - Debug and troubleshoot issues
- `testing` - Write and run tests
- `documentation` - Generate documentation
- `planning` - Create implementation plans
- `research` - Research technical topics
- `refactoring` - Refactor and improve code

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test
```

## Architecture

- **ConfigManager**: Handles configuration hierarchy and merging
- **AgentManager**: CRUD operations for agents
- **Validators**: Input validation for agent names, types, capabilities
- **Path Utilities**: Cross-platform path handling

## Contributing

Contributions welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

- [x] Phase 1: Foundation & Core CLI
- [x] Phase 2: Tmux Integration & Session Management (CURRENT)
- [ ] Phase 3: AI Provider Integration
- [ ] Phase 4: Task Orchestration
- [ ] Phase 5: Database Migration (PostgreSQL)
- [ ] Phase 6: Advanced Features (monitoring, metrics, CI/CD)

## Documentation

Complete documentation available in [docs/](./docs/README.md):

### User Documentation
- **[Getting Started](./docs/GETTING_STARTED.md)** - Installation and quick start (5-10 minutes)
- **[User Guide](./docs/USER_GUIDE.md)** - Complete feature guide with examples
- **[Configuration](./docs/CONFIGURATION.md)** - All configuration options
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Developer Documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and components
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Development setup and contributing
- **[API Documentation](./docs/API.md)** - REST API reference
- **[OpenAPI Spec](./docs/api/openapi.yaml)** - OpenAPI 3.0 specification

### Operations & Security
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment (systemd, Docker, Kubernetes)
- **[Security](./docs/SECURITY.md)** - Security best practices and compliance

### Project Information
- **[Roadmap](./docs/ROADMAP.md)** - Feature roadmap and timeline
- **[Changelog](./docs/CHANGELOG.md)** - Release history and changes

### Examples
- **[Agent Configurations](./docs/examples/agent-configs.json)** - Example agent definitions
- **[Task Workflows](./docs/examples/task-workflows.sh)** - Example workflows
- **[Docker Compose](./docs/examples/docker-compose.yml)** - Docker development setup

## Support

For issues and questions:
- **GitHub Issues**: [Report bugs](https://github.com/yourusername/mindmux/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/yourusername/mindmux/discussions)
- **Documentation**: [docs/](./docs/README.md)

---

Built with TypeScript, Commander.js, and love for automation.
