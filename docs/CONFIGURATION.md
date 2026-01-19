# MindMux Configuration Reference

Complete configuration options for MindMux.

## Configuration Hierarchy

MindMux merges configuration from multiple sources (highest to lowest priority):

1. **Environment Variables** - `MINDMUX_*`
2. **Project-Local Config** - `./.mindmux/config.json`
3. **Global Config** - `~/.mindmux/config.json`
4. **Defaults** - Hardcoded defaults

Later sources override earlier ones.

## Configuration Locations

### Global Configuration

Location: `~/.mindmux/config.json`

Applies to all MindMux projects on your machine.

### Project-Local Configuration

Location: `./.mindmux/config.json` (in your project root)

Overrides global configuration for this project only.

Example:
```bash
cd /path/to/my-project
mkdir -p .mindmux
cat > .mindmux/config.json << 'EOF'
{
  "maxConcurrentAgents": 5,
  "timeout": 1800000
}
EOF
```

## Configuration Schema

### Root Level

```json
{
  "version": "0.1.0",
  "defaultAgentType": "claude",
  "defaultModel": { },
  "timeout": 3600000,
  "maxConcurrentAgents": 10,
  "logging": { },
  "tmux": { },
  "apiKeys": { }
}
```

### version

- **Type**: string
- **Default**: `"0.1.0"`
- **Description**: Configuration schema version (for future compatibility)

### defaultAgentType

- **Type**: string
- **Default**: `"claude"`
- **Options**: `claude`, `gemini`, `gpt4`, `opencode`
- **Description**: Default agent type when not specified

Example:
```json
{
  "defaultAgentType": "claude"
}
```

### defaultModel

- **Type**: object
- **Description**: Default models for each agent type

```json
{
  "defaultModel": {
    "claude": "claude-opus-4-5-20250929",
    "gemini": "gemini-2-5-flash",
    "gpt4": "gpt-4-turbo",
    "opencode": "opencode-latest"
  }
}
```

All fields optional. If not specified, uses provider's default.

### timeout

- **Type**: number (milliseconds)
- **Default**: `3600000` (1 hour)
- **Description**: Task timeout duration

Examples:
- `300000` = 5 minutes
- `900000` = 15 minutes
- `1800000` = 30 minutes
- `3600000` = 1 hour

```json
{
  "timeout": 1800000
}
```

### maxConcurrentAgents

- **Type**: number
- **Default**: `10`
- **Range**: 1-100
- **Description**: Maximum number of agents running simultaneously

```json
{
  "maxConcurrentAgents": 5
}
```

## Logging Configuration

### logging.level

- **Type**: string
- **Default**: `"info"`
- **Options**: `debug`, `info`, `warn`, `error`
- **Description**: Minimum log level to output

```json
{
  "logging": {
    "level": "debug"
  }
}
```

Levels in order of verbosity:
- `debug` - Most verbose, includes internal operations
- `info` - Standard information
- `warn` - Warnings and non-critical issues
- `error` - Errors only

### logging.enableAgentLogs

- **Type**: boolean
- **Default**: `true`
- **Description**: Enable per-agent log files

```json
{
  "logging": {
    "enableAgentLogs": true
  }
}
```

When enabled, creates `~/.mindmux/logs/agents/{agent-id}.log`

### logging.maxLogSizeMB

- **Type**: number
- **Default**: `100`
- **Description**: Maximum log file size in MB before rotation

```json
{
  "logging": {
    "maxLogSizeMB": 100
  }
}
```

When a log exceeds this size, it's rotated to `{name}.log.1`, etc.

### logging.format

- **Type**: string
- **Default**: `"json"`
- **Options**: `json`, `text`
- **Description**: Log output format

```json
{
  "logging": {
    "format": "text"
  }
}
```

## tmux Configuration

### tmux.sessionPrefix

- **Type**: string
- **Default**: `"mindmux"`
- **Description**: Prefix for tmux session names

Sessions are named: `{prefix}-{agent-id}`

Example with prefix `my-app`:
- Session name: `my-app-a1b2c3d4`

```json
{
  "tmux": {
    "sessionPrefix": "my-app"
  }
}
```

### tmux.keepSessionsAlive

- **Type**: boolean
- **Default**: `true`
- **Description**: Keep tmux sessions alive after CLI exits

When true, sessions persist until explicitly stopped.
When false, sessions end when CLI process ends.

```json
{
  "tmux": {
    "keepSessionsAlive": true
  }
}
```

### tmux.baseIndex

- **Type**: number
- **Default**: `0`
- **Description**: Starting window index in tmux sessions

Most users don't need to change this.

```json
{
  "tmux": {
    "baseIndex": 0
  }
}
```

## API Keys Configuration

### API Keys via Config File

Store API keys in `~/.mindmux/config.json`:

```json
{
  "apiKeys": {
    "claude": "sk-ant-...",
    "gemini": "AIza...",
    "gpt4": "sk-...",
    "opencode": "oc-..."
  }
}
```

**Warning:** Never commit this file to git!

### API Keys via Environment Variables

Use environment variables instead (more secure):

```bash
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
export MINDMUX_GEMINI_API_KEY="AIza..."
export MINDMUX_GPT4_API_KEY="sk-..."
export MINDMUX_OPENCODE_API_KEY="oc-..."
```

Environment variables take precedence over config file.

### API Keys via .env File

Create `.env` in your project (add to `.gitignore`):

```bash
MINDMUX_CLAUDE_API_KEY=sk-ant-...
MINDMUX_GEMINI_API_KEY=AIza...
MINDMUX_GPT4_API_KEY=sk-...
```

Load before running:
```bash
set -a
source .env
set +a
mux agent:list
```

## Complete Configuration Examples

### Minimal Configuration

```json
{
  "version": "0.1.0"
}
```

Uses all defaults.

### Development Setup

For local development:

```json
{
  "defaultAgentType": "claude",
  "maxConcurrentAgents": 3,
  "timeout": 1800000,
  "logging": {
    "level": "debug",
    "enableAgentLogs": true
  }
}
```

### Production Setup

For production deployment:

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

### Project-Specific Override

In `./.mindmux/config.json`:

```json
{
  "maxConcurrentAgents": 5,
  "timeout": 900000,
  "logging": {
    "level": "info"
  }
}
```

This overrides global settings for this project only.

## Environment Variables

All configuration options can be set via environment variables using the pattern `MINDMUX_{OPTION}` in UPPER_SNAKE_CASE.

### Examples

```bash
export MINDMUX_DEFAULT_AGENT_TYPE="gemini"
export MINDMUX_MAX_CONCURRENT_AGENTS="5"
export MINDMUX_TIMEOUT="900000"
export MINDMUX_LOGGING_LEVEL="debug"
export MINDMUX_TMUX_SESSION_PREFIX="my-app"
export MINDMUX_CLAUDE_API_KEY="sk-ant-..."
```

Environment variables take precedence over config files.

## Viewing Current Configuration

Show merged configuration:

```bash
mux config:show
```

Output:
```
Merged Configuration:
├── defaultAgentType: claude
├── timeout: 3600000
├── maxConcurrentAgents: 10
├── logging:
│   ├── level: info
│   └── enableAgentLogs: true
└── tmux:
    └── sessionPrefix: mindmux
```

Show as JSON:
```bash
mux config:show --json
```

Show only specific option:
```bash
mux config:show --option logging.level
```

## Configuration File Locations

### Config Directory

All MindMux configuration and data stored in:

```
~/.mindmux/
├── config.json              # Global configuration
├── agents.json              # Registered agents
├── metadata.json            # CLI metadata
├── logs/                    # Log files
│   └── agents/              # Per-agent logs
├── cache/                   # Temporary files
│   └── sessions/            # Session state
└── .gitignore               # Sensitive files
```

### Project Directory

Optional project-specific configuration:

```
.mindmux/
└── config.json              # Project configuration (overrides global)
```

## Resetting Configuration

Reset to defaults:

```bash
rm -rf ~/.mindmux/config.json
```

Or reset just a project:

```bash
rm -rf ./.mindmux/config.json
```

MindMux will recreate with defaults on next run.

## Validation

MindMux validates configuration on startup. Invalid values error:

```bash
Error: Invalid configuration
  timeout must be a positive number
  maxConcurrentAgents must be 1-100
```

Fix the issue and try again.

## Best Practices

1. **Use project-local config** for project-specific settings
2. **Use environment variables** for sensitive data (API keys)
3. **Don't commit config files** with credentials to git
4. **Check merged config** with `mux config:show` when debugging
5. **Use defaults** when possible, override only when needed

---

For more help, see [GETTING_STARTED.md](./GETTING_STARTED.md) or run `mux config:show --help`.
