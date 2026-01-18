# MindMux

Multi-Agent AI CLI for orchestrating AI agents in development workflows.

## Overview

MindMux is a command-line tool for managing and orchestrating multiple AI agents (Claude, Gemini, GPT-4, OpenCode) to work together on complex development tasks. It provides a unified interface for creating, managing, and coordinating AI agents with different capabilities.

## Features

- **Multi-Agent Management**: Create and manage multiple AI agents with different capabilities
- **Agent Types**: Support for Claude, Gemini, GPT-4, and OpenCode
- **Configuration Hierarchy**: Project-local configs override global settings
- **Capabilities System**: Assign specific capabilities (code-generation, code-review, debugging, testing, etc.)
- **Status Tracking**: Monitor agent status and activity
- **Cross-Platform**: Works on Linux, macOS, and Windows (WSL)

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

- [x] Phase 1: Foundation & Core CLI (CURRENT)
- [ ] Phase 2: Tmux Integration & Session Management
- [ ] Phase 3: AI Provider Integration
- [ ] Phase 4: Task Orchestration
- [ ] Phase 5: Database Migration (PostgreSQL)
- [ ] Phase 6: Advanced Features (monitoring, metrics, CI/CD)

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/mindmux/issues
- Documentation: [Coming soon]

---

Built with TypeScript, Commander.js, and love for automation.
