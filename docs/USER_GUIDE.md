# MindMux User Guide

Complete guide to all MindMux features and usage patterns.

## Table of Contents

1. [Agent Management](#agent-management)
2. [Viewing Logs](#viewing-logs)
3. [Configuration](#configuration)
4. [Common Workflows](#common-workflows)
5. [Agent Types and Capabilities](#agent-types-and-capabilities)
6. [Best Practices](#best-practices)

## Agent Management

### Creating Agents

**Basic creation:**
```bash
mux agent:create {name} --type {type}
```

**With capabilities:**
```bash
mux agent:create my-agent --type claude --capabilities code-generation,code-review
```

**With custom model:**
```bash
mux agent:create my-agent --type claude --model claude-opus-4-5-20250929
```

**From configuration file:**
```bash
mux agent:create --config agent-config.json
```

**Requirements for agent names:**
- Alphanumeric, hyphens, underscores only
- 3-50 characters
- Must be unique
- Examples: `my-agent`, `code_gen_v2`, `agent123`

### Listing Agents

**Simple list:**
```bash
mux agent:list
```

Output:
```
Name         Type    Status  Capabilities
my-agent     claude  idle    code-generation
test-bot     gemini  busy    testing
reviewer     claude  error   code-review
```

**Detailed view:**
```bash
mux agent:list --verbose
```

Shows more information: ID, model, creation date, last activity.

**Filter by status:**
```bash
mux agent:list --status idle
mux agent:list --status busy
mux agent:list --status error
```

### Starting Agents

**Start an agent:**
```bash
mux agent:start {name}
```

The agent runs in a tmux session named `mindmux-{id}`.

**Start and attach:**
```bash
mux agent:start {name} --attach
```

This attaches you directly to the tmux session.

**Start multiple agents:**
```bash
mux agent:start agent1 agent2 agent3
```

### Stopping Agents

**Graceful shutdown:**
```bash
mux agent:stop {name}
```

Gives the agent a few seconds to clean up.

**Force kill:**
```bash
mux agent:stop {name} --force
```

**Stop all agents:**
```bash
mux agent:stop --all
```

### Viewing Agent Status

**Status overview:**
```bash
mux agent:status {name}
```

Output:
```
Agent: my-agent (a1b2c3d4)
Type: claude
Status: busy
Uptime: 2h 15m
Capabilities: code-generation, code-review
```

### Viewing Agent Logs

**Last N lines:**
```bash
mux agent:logs {name} --lines 50
```

**Follow live output (like tail -f):**
```bash
mux agent:logs {name} --follow
```

Exit with Ctrl+C.

**Get entire log file:**
```bash
mux agent:logs {name} --all
```

**Save to file:**
```bash
mux agent:logs {name} > agent-logs.txt
```

### Updating Agents

**Update capabilities:**
```bash
mux agent:update {name} --capabilities code-generation,testing
```

**Update model:**
```bash
mux agent:update {name} --model claude-opus-4-5-20250929
```

### Deleting Agents

**Delete with confirmation:**
```bash
mux agent:delete {name}
```

**Skip confirmation:**
```bash
mux agent:delete {name} --yes
```

**Warning:** Deletion is permanent. All agent metadata and logs are deleted.

## Viewing Logs

### From CLI

**View recent logs:**
```bash
mux agent:logs my-agent --lines 100
```

**Follow live logs:**
```bash
mux agent:logs my-agent --follow
```

**Get all logs:**
```bash
mux agent:logs my-agent --all
```

### From tmux

**Attach to agent session:**
```bash
tmux attach -t mindmux-{agent-id}
```

Find the agent ID:
```bash
mux agent:list --verbose
```

**Navigate in tmux:**
- `Space` or `PageDown` - Scroll down
- `Shift+PageUp` - Scroll up
- `?` - Show help
- `q` - Exit help
- `Ctrl+B D` - Detach from session (don't kill it)
- `Ctrl+B X` - Kill session

### Log Levels

MindMux supports different log levels. Set in config:

```json
{
  "logging": {
    "level": "debug"
  }
}
```

Levels: `debug` > `info` > `warn` > `error`

## Configuration

### Configuration Files

Configuration hierarchy (highest to lowest priority):

1. **Project-local**: `./.mindmux/config.json`
2. **Global**: `~/.mindmux/config.json`
3. **Environment variables**: `MINDMUX_*`
4. **Defaults**: Hardcoded

### Show Current Configuration

```bash
mux config:show
```

Displays merged configuration from all sources.

```bash
mux config:show --json
```

Output as JSON (useful for scripts).

### Common Configuration Options

See [CONFIGURATION.md](./CONFIGURATION.md) for complete reference.

**Example global config:**
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

## Common Workflows

### Workflow 1: Code Generation and Review

Create two agents: one for generation, one for review.

```bash
# Create code generator
mux agent:create code-gen --type claude --capabilities code-generation

# Create code reviewer
mux agent:create reviewer --type claude --capabilities code-review

# Start both
mux agent:start code-gen reviewer

# Monitor their output
mux agent:logs code-gen --follow
mux agent:logs reviewer --follow  # In another terminal
```

### Workflow 2: Testing and Debugging

```bash
# Create test runner
mux agent:create test-runner --type gemini --capabilities testing

# Create debugger
mux agent:create debugger --type claude --capabilities debugging

# Start and view logs
mux agent:start test-runner debugger
mux agent:logs test-runner --follow
```

### Workflow 3: Research and Documentation

```bash
# Create researcher
mux agent:create researcher --type claude --capabilities research

# Create documenter
mux agent:create doc-writer --type claude --capabilities documentation

# Start and log
mux agent:start researcher doc-writer
mux agent:logs researcher --follow
```

### Workflow 4: Multi-Project Setup

Create project-specific configuration:

**.mindmux/config.json** (in your project):
```json
{
  "maxConcurrentAgents": 5,
  "timeout": 1800000,
  "logging": {
    "level": "debug"
  }
}
```

Then all agents in this project inherit these settings.

## Agent Types and Capabilities

### Supported Agent Types

- **claude** - Anthropic's Claude models
- **gemini** - Google's Gemini models
- **gpt4** - OpenAI's GPT-4 models
- **opencode** - OpenCode models

### Available Capabilities

- `code-generation` - Generate code from specifications
- `code-review` - Review code quality and suggest improvements
- `debugging` - Debug and troubleshoot issues
- `testing` - Write and run tests
- `documentation` - Generate and improve documentation
- `planning` - Create implementation plans
- `research` - Research technical topics
- `refactoring` - Refactor and improve code

### Agent Type Support Matrix

| Type | Supported Capabilities |
|------|------------------------|
| claude | All capabilities |
| gemini | code-generation, testing, research, documentation |
| gpt4 | code-generation, code-review, debugging, testing |
| opencode | code-generation, refactoring |

## Best Practices

### 1. Use Project-Local Configuration

Create `.mindmux/config.json` in your project root for project-specific settings:

```json
{
  "timeout": 1800000,
  "maxConcurrentAgents": 3,
  "logging": {
    "level": "info"
  }
}
```

This keeps global config clean and per-project settings isolated.

### 2. Name Agents Meaningfully

Use descriptive names that indicate the agent's purpose:

```bash
mux agent:create code-gen-v2 --type claude --capabilities code-generation
mux agent:create api-reviewer --type claude --capabilities code-review
mux agent:create ml-researcher --type claude --capabilities research
```

### 3. Monitor Logs Regularly

Keep logs visible during development:

```bash
# In one terminal
mux agent:logs my-agent --follow

# In another, trigger work
mux agent:queue-task my-agent "Your task"
```

### 4. Clean Up Unused Agents

Periodically remove agents that are no longer needed:

```bash
mux agent:list
mux agent:delete {unused-agent-name} --yes
```

### 5. Use Specific Capabilities

Assign only the capabilities an agent needs:

```bash
# Good: specific
mux agent:create reviewer --type claude --capabilities code-review

# Less efficient: too broad
mux agent:create general --type claude --capabilities code-generation,code-review,testing,debugging
```

### 6. Set Appropriate Timeouts

Adjust timeout based on task complexity:

```json
{
  "timeout": 3600000
}
```

- 300000ms (5 min) - Quick tasks
- 1800000ms (30 min) - Moderate tasks
- 3600000ms (60 min) - Long-running tasks

### 7. Handle Errors Gracefully

When an agent errors, check logs:

```bash
mux agent:logs {name} --lines 100
mux agent:status {name}
```

Then either:
- Update agent configuration
- Fix the underlying issue
- Delete and recreate the agent

---

For detailed configuration options, see [CONFIGURATION.md](./CONFIGURATION.md).

For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
