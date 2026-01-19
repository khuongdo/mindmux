# MindMux Architecture

System design, components, and data flow for MindMux.

## Overview

MindMux is a multi-agent CLI orchestration platform that manages AI agents (Claude, Gemini, GPT-4, OpenCode) working together on complex tasks.

### Core Design Principles

1. **Modularity** - Loosely coupled components that can be extended
2. **Persistence** - Agent state survives CLI process exit
3. **Isolation** - Each agent runs in isolated tmux session
4. **Composability** - Agents can coordinate on shared tasks
5. **Observability** - Real-time logs and event streaming

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface (Commander.js)             │
│  agent:create  agent:list  agent:start  agent:stop  etc.   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│ AgentManager │ │ConfigManager │ │   Validators   │
│ CRUD ops     │ │ Config merge │ │ Input checking │
└──────┬───────┘ └──────────────┘ └────────────────┘
       │
       ├─────────────┬──────────────┬──────────────┐
       ▼             ▼              ▼              ▼
┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐
│Persistence│ │TmuxClient│ │ Logger       │ │FileSystem  │
│(File I/O) │ │Session   │ │(Log files)   │ │Utilities   │
│           │ │Management│ │              │ │(Paths)     │
└───────────┘ └──────────┘ └──────────────┘ └────────────┘
       │             │
       └─────────────┴─────────────────────────┐
                                               ▼
                        ~/.mindmux/ (Persistent Storage)
                        ├── config.json
                        ├── agents.json
                        ├── logs/
                        └── cache/
```

## Key Components

### 1. CLI Interface (Commander.js)

Entry point for all user commands.

**Location**: `src/cli.ts`

**Commands**:
- `agent:create` - Create new agent
- `agent:list` - List all agents
- `agent:start` - Start agent in tmux
- `agent:stop` - Stop agent
- `agent:status` - Check agent status
- `agent:delete` - Delete agent
- `agent:logs` - View agent logs
- `agent:update` - Update agent config
- `config:show` - Display merged configuration

### 2. AgentManager

Handles all agent CRUD operations.

**Location**: `src/core/agent-manager.ts`

**Responsibilities**:
- Create agents with validation
- List agents with filtering
- Update agent properties
- Delete agents
- Query agent status
- Start/stop agents via TmuxClient

**Key Methods**:
- `createAgent(name, type, capabilities)` - Create new agent
- `listAgents(filters)` - List with optional filters
- `getAgent(id)` - Get specific agent
- `updateAgent(id, properties)` - Update properties
- `deleteAgent(id)` - Delete agent
- `startAgent(id)` - Start in tmux
- `stopAgent(id, force)` - Stop agent
- `getAgentStatus(id)` - Get current status

### 3. ConfigManager

Manages configuration hierarchy and merging.

**Location**: `src/core/config-manager.ts`

**Hierarchy** (highest to lowest priority):
1. Environment variables (`MINDMUX_*`)
2. Project-local (`./.mindmux/config.json`)
3. Global (`~/.mindmux/config.json`)
4. Defaults (hardcoded)

**Key Methods**:
- `loadConfig()` - Load and merge all sources
- `getConfig(key)` - Get config value
- `setConfig(key, value)` - Update config
- `saveConfig()` - Persist to file

### 4. TmuxClient

Manages tmux session lifecycle for agents.

**Location**: `src/core/tmux-client.ts`

**Responsibilities**:
- Create tmux sessions
- Execute commands in sessions
- Stream session output
- Capture session logs
- Kill sessions
- Monitor session status

**Key Methods**:
- `createSession(name)` - Create tmux session
- `sendCommand(session, cmd)` - Send command to session
- `getSessionOutput(session)` - Get session logs
- `killSession(session)` - Kill session
- `sessionExists(name)` - Check if session exists

### 5. Validators

Input validation for all user input.

**Location**: `src/core/validators.ts`

**Validates**:
- Agent names (alphanumeric, hyphens, underscores)
- Agent types (claude, gemini, gpt4, opencode)
- Capabilities (valid capability list)
- Configuration values (types, ranges)

### 6. Persistence Layer

File-based storage for agents and configuration.

**Location**: `src/core/persistence.ts`

**Stores**:
- Agents metadata (`~/.mindmux/agents.json`)
- Global config (`~/.mindmux/config.json`)
- Project config (`./.mindmux/config.json`)
- Agent logs (`~/.mindmux/logs/agents/{id}.log`)

**Key Methods**:
- `loadAgents()` - Load agents from disk
- `saveAgents(agents)` - Persist agents
- `loadLogs(agentId)` - Read agent logs
- `appendLog(agentId, message)` - Write to agent logs

## Data Flow

### 1. Agent Creation Flow

```
User Input
  ↓
CLI (commander.js)
  ↓
Validators (check name, type, capabilities)
  ↓
AgentManager.createAgent()
  ↓
Persistence (save to agents.json)
  ↓
TmuxClient (optional: create session)
  ↓
Success Response
```

### 2. Agent Start Flow

```
User: mux agent:start {name}
  ↓
CLI
  ↓
AgentManager.startAgent(name)
  ↓
ConfigManager (get agent config)
  ↓
TmuxClient.createSession()
  ↓
Launch agent process in session
  ↓
Start log streaming
  ↓
Return session info
```

### 3. Log Streaming Flow

```
User: mux agent:logs {name} --follow
  ↓
CLI
  ↓
Persistence.getAgentLogs(name)
  ↓
Read log file
  ↓
Tail file (if --follow)
  ↓
Stream to stdout
```

## Configuration Hierarchy

```
┌──────────────────────────────────────────┐
│ 1. Environment Variables (MINDMUX_*)     │  Highest Priority
├──────────────────────────────────────────┤
│ 2. Project-Local Config (.mindmux/...)   │
├──────────────────────────────────────────┤
│ 3. Global Config (~/.mindmux/...)        │
├──────────────────────────────────────────┤
│ 4. Hardcoded Defaults                    │  Lowest Priority
└──────────────────────────────────────────┘
```

**Example Merge**:

```json
// Defaults
{ "timeout": 3600000, "maxAgents": 10 }

// Global (~/.mindmux/config.json)
{ "maxAgents": 5 }

// Project (./.mindmux/config.json)
{ "timeout": 1800000 }

// Result (merged)
{ "timeout": 1800000, "maxAgents": 5 }
```

## File Structure

```
mindmux/
├── src/
│   ├── cli.ts                      # Main CLI entry
│   ├── core/
│   │   ├── agent-manager.ts        # Agent CRUD
│   │   ├── config-manager.ts       # Config handling
│   │   ├── tmux-client.ts          # Tmux operations
│   │   ├── validators.ts           # Input validation
│   │   ├── persistence.ts          # File I/O
│   │   └── path-utils.ts           # Cross-platform paths
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── utils/
│       └── index.ts                # Utility functions
├── dist/                           # Compiled JavaScript
├── test/                           # Tests
├── docs/                           # Documentation
└── package.json

~/.mindmux/
├── config.json                     # Global configuration
├── agents.json                     # Agent registry
├── metadata.json                   # CLI metadata
├── logs/
│   └── agents/
│       ├── {agent-id}.log          # Per-agent logs
│       └── {agent-id}.log.1        # Rotated logs
└── cache/
    └── sessions/                   # Session state cache
```

## Design Decisions

### Why File-Based Persistence?

- **Simplicity**: No external database dependency (Phase 1-4)
- **Portability**: Works on all platforms
- **Easy Debugging**: Humans can read agents.json
- **Atomic Operations**: Less risk of corruption
- **Migration Path**: Can move to PostgreSQL in Phase 5

### Why tmux for Session Management?

- **Persistence**: Sessions survive CLI process exit
- **Multiplexing**: Multiple windows/panes per agent
- **Terminal Support**: Works over SSH, tmux attach
- **Logging**: Native logging to file
- **Cross-Platform**: Available on Linux, macOS, WSL
- **Lightweight**: Minimal resource overhead

### Why Commander.js?

- **Developer-Friendly**: Easy command definition
- **Help Generation**: Auto-generates help text
- **Validation**: Built-in argument validation
- **Familiar**: Similar to popular CLIs (npm, git)

### Why Modular Components?

- **Testability**: Each component independently testable
- **Reusability**: Components used by different commands
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new providers later

## Extension Points

### Adding a New Agent Type

1. Add type to `AgentType` enum in `src/types/index.ts`
2. Add default model in `src/core/config-manager.ts`
3. Add validation in `src/core/validators.ts`
4. Use in `AgentManager.createAgent()`

### Adding a New Command

1. Create command handler in `src/cli.ts`
2. Use existing managers (AgentManager, ConfigManager)
3. Add help text and examples
4. Add tests in `test/`

### Adding a New Capability

1. Add to `Capability` enum in `src/types/index.ts`
2. Document in `docs/CONFIGURATION.md`
3. Update validation in `src/core/validators.ts`

## Performance Considerations

### Agent Startup

- File I/O: ~50ms
- Config merge: ~1ms
- Tmux session creation: ~100ms
- **Total**: ~150ms typical

### Listing Agents

- Load agents.json: ~10ms (100 agents)
- Filter/sort: ~1ms
- **Total**: ~11ms typical

### Log Streaming

- Initial read: ~5ms per MB
- Tail/follow: Real-time via file system

### Memory Usage

- Per agent metadata: ~500 bytes
- Configuration: ~1-2 KB
- **100 agents**: ~50+ KB

## Future Architecture Changes

### Phase 5: PostgreSQL Migration

- Add database layer
- Move agents to PostgreSQL
- Add relational queries
- Support for distributed deployments

### Phase 6: API Server

- HTTP server with REST API
- WebSocket for real-time events
- Authentication layer
- Rate limiting

### Phase 7+: Clustering

- Multi-machine deployments
- Message queue (Redis/RabbitMQ)
- Distributed task scheduling
- Leader election

## Testing Strategy

### Unit Tests

- Test individual components (AgentManager, ConfigManager)
- Mock tmux and file system
- Fast execution (~100ms)

### Integration Tests

- Test workflows (create → start → logs → stop)
- Use real tmux (if available)
- Slower execution (~1s)

### End-to-End Tests

- Full CLI workflows
- Test all commands
- Longest execution (~5s)

---

For more details, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).
