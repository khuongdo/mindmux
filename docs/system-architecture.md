# System Architecture

**Last Updated:** 2026-01-19 | **Version:** 2.1.0

## High-Level Design

MindMux follows a **Passive Session Tracker** pattern:

```
┌─────────────────────────────────────┐
│      MindMux TUI Dashboard          │
│  (Interactive Session Management)   │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ↓                 ↓
┌─────────────┐   ┌──────────────────┐
│  Discovery  │   │   Operations     │
│  (Passive)  │   │  (User-Driven)   │
│             │   │                  │
│ • Scan tmux │   │ • Create session │
│ • Detect    │   │ • Fork session   │
│   status    │   │ • Manage MCPs    │
│ • Identify  │   │ • Label session  │
│   tools     │   │ • Search         │
└─────────────┘   └──────────────────┘
    │                     │
    └────────────┬────────┘
                 │
                 ↓
         ┌──────────────────┐
         │ Core Integration │
         │  (TmuxController)│
         │                  │
         │ • Execute shell  │
         │   commands       │
         │ • Capture output │
         │ • Send input     │
         └──────────────────┘
                 │
                 ↓
         ┌──────────────────┐
         │   tmux Server    │
         │ (OS-level)       │
         │                  │
         │ • Sessions       │
         │ • Panes          │
         │ • Processes      │
         └──────────────────┘
```

## Component Interactions

### 1. Session Discovery (Passive Polling)

**Flow:**
```
Dashboard.refresh() [every 500ms]
    ↓
SessionScanner.scan()
    ├─ tmux ls (list sessions)
    ├─ tmux list-panes (get panes per session)
    ├─ ps lookup (get process names)
    └─ return sessions[]
    ↓
For each session, StatusDetector.detect()
    ├─ captureOutput() (read pane content)
    ├─ Check for AI tool presence
    ├─ Analyze pane state
    └─ return status
    ↓
For each session, AIToolDetector.identify()
    ├─ Match process name against patterns
    ├─ Classify tool type (claude, gemini, etc.)
    └─ return tool
    ↓
Dashboard.render() (display with colors & status)
```

**Characteristics:**
- Read-only (no session modifications)
- Polling interval: 500ms (configurable)
- Non-blocking (async operations)
- Handles tool discovery failures gracefully

### 2. Session Creation (User-Initiated)

**Flow:**
```
User presses 'n' key
    ↓
Dashboard.createNewSession()
    ├─ promptForTool() → user selects 1-6
    ├─ promptForPath() → user enters path
    ├─ promptForNewLabel() → optional label
    └─ SessionCreator.createSession()
        ├─ Validate path exists
        ├─ Sanitize inputs (remove shell chars)
        ├─ Create tmux session
        ├─ Send start command (claude, gemini, etc.)
        ├─ Wait for tool initialization
        │  ├─ Poll pane output every 500ms
        │  ├─ Check for tool readiness (timeout: 5-10s per tool)
        │  └─ Throw error if not ready
        └─ Return CreateSessionResult
    ↓
Display success/error feedback
    ├─ Show session name & pane ID
    ├─ Show troubleshooting if failed
    └─ Return to dashboard
```

**Key Decisions:**
- **Sanitization:** Remove dangerous shell characters before tmux commands
- **Timeout:** Tool-specific (claude: 8s, gemini: 5s, etc.)
- **Cleanup:** Kill session if tool fails to start
- **User Feedback:** Clear success/error messages with remediation steps

### 3. Session Forking (Clone with History)

**Flow:**
```
User presses 'f' on selected session
    ↓
Dashboard.forkSession(sessionId)
    ↓
SessionFork.fork()
    ├─ Get session info (tool, path)
    ├─ Capture pane output (conversation history)
    ├─ SessionCreator.createSession() (new session, same tool)
    ├─ ConversationParser.parse() (extract conversation)
    ├─ Replay history via tmux send-keys
    └─ Return new session ID
    ↓
Add new session to dashboard list
```

**History Preservation:**
- Extract full pane content (ANSI codes removed)
- Send line-by-line to new session
- Preserves message sequence and conversation context

### 4. MCP Management (Toggle per-Session)

**Flow:**
```
User presses 'm' on selected session
    ↓
Dashboard.manageMcp(sessionId)
    ↓
MCPManager.show()
    ├─ Load config from ~/.mindmux/mcp-servers.toml
    ├─ Show available servers with status
    ├─ User selects server to toggle
    └─ MCPManager.toggle()
        ├─ Stop current session
        ├─ Modify MCP configuration
        ├─ Restart AI tool with new MCP state
        └─ Confirm restart complete
    ↓
Return to dashboard
```

**Configuration Scope:**
- **local:** Per-project MCP servers
- **global:** Available to all sessions

**Example Config (mcp-servers.toml):**
```toml
[mcp.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
scope = "local"

[mcp.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
scope = "global"

[mcp.github.env]
GITHUB_TOKEN = "ghp_token"
```

### 5. Session Labeling & Search

**Flow:**
```
User presses 'l' on session
    ↓
Dashboard.labelSession()
    ├─ Prompt for label text
    ├─ Save to ~/.mindmux/session-labels.json
    └─ Update dashboard display
    ↓
User presses '/' for search
    ↓
Dashboard.search()
    ├─ Prompt for search query
    ├─ Filter sessions by:
    │  ├─ Label match
    │  ├─ Tool name match
    │  ├─ Project path match
    │  └─ Status match
    └─ Display filtered list
```

**Label Persistence:**
- Stored in JSON file: `~/.mindmux/session-labels.json`
- Survives dashboard restart
- Keyed by pane ID + timestamp

## Data Structures

### Session Object
```typescript
interface Session {
  id: string;              // tmux pane ID (e.g., "%0")
  tool: AITool;            // detected tool type
  status: SessionStatus;   // ● ◐ ○ ✕
  projectPath: string;     // working directory
  label?: string;          // user-provided label
  timestamp: number;       // creation time
}

type AITool = 'claude' | 'gemini' | 'opencode' | 'cursor' | 'aider' | 'codex';
type SessionStatus = 'running' | 'waiting' | 'idle' | 'error';
```

### Creation Options
```typescript
interface CreateSessionOptions {
  tool: AITool;
  projectPath: string;
  label?: string;
}

interface CreateSessionResult {
  sessionName: string;     // "mindmux-claude-1705691200000"
  paneId: string;          // "%0"
  success: boolean;
  error?: string;          // error message if failed
}
```

### MCP Configuration
```typescript
interface MCPConfig {
  [name: string]: {
    command: string;       // executable
    args: string[];        // CLI arguments
    scope: 'local' | 'global';
    env?: Record<string, string>;
  };
}
```

## Security Architecture

### Threat Model

| Threat | Mitigation | Implementation |
|--------|-----------|-----------------|
| Command injection | Input sanitization | Remove shell metacharacters |
| Path traversal | Path validation | Check directory exists before use |
| Buffer overflow | Length limits | Max 200 chars session name, 500 chars path |
| Privilege escalation | No elevation | All commands run as current user |
| Unintended process kill | Exact session naming | Unique timestamp in session name |

### Sanitization Rules

**Function:** `sanitizeShellArg(arg: string): string`

**Removes:** `;`, `&`, `|`, backtick, `$`, `(`, `)`, `<`, `>`, `'`, `"`, `\`

**Example:**
```typescript
// Input from user
const userInput = "path/with; rm -rf /";

// After sanitization
const safe = sanitizeShellArg(userInput);
// Output: "path/with rm -rf "

// Safe for shell execution
execSync(`tmux new-session -s "${safe}"`);
```

### Execution Context Isolation

Each session runs in isolated tmux pane:
- No shell metacharacter interpretation in pane names
- Working directory scoped per session
- Process environment inherited from parent shell only
- Pane content (stdout) parsed, not executed

## Performance Optimization

### Caching Strategy

**Session List Cache:**
```
SessionScanner.cache: Session[]
Last updated: timestamp

Dashboard.refresh()
  ├─ If cache valid (< 500ms old)
  │  └─ Return cached result
  ├─ Else
  │  ├─ Scan tmux (execSync commands)
  │  ├─ Update cache
  │  └─ Clear timestamp
```

**Label Cache:**
```
ConfigLoader.labelCache: Record<string, string>
Loaded on dashboard startup
Updated on label change only
```

### Async Patterns

**Non-blocking Discovery:**
```typescript
// Refresh runs continuously without blocking user input
Dashboard.startRefresh()
  └─ Every 500ms (non-blocking):
      ├─ Call SessionScanner.scan() (sync, but fast)
      ├─ Update internal state
      └─ Schedule re-render

// User input processed immediately
Dashboard.handleKeypress(key)
  ├─ Stop refresh
  ├─ Process user action
  └─ Resume refresh
```

**Debounced Updates:**
```
User changes label
  ├─ Update display immediately
  ├─ Save to disk asynchronously
  └─ Don't block dashboard
```

## Deployment Topology

### Single-Machine Setup
```
User Terminal
    ↓
MindMux CLI (node process)
    ├─ TUI Dashboard
    ├─ Session Discovery
    └─ Operation Commands
    ↓
tmux Server (system daemon)
    ├─ Session 1: Claude
    ├─ Session 2: Gemini
    ├─ Session 3: OpenCode
    └─ Session N: ...
```

### Supported Platforms
- **macOS:** Native support (Darwin kernel)
- **Linux:** Full support (tested on Ubuntu, Debian)
- **Windows:** Requires WSL2 with tmux
- **Minimum:** tmux 3.0, Node.js 18+

### Configuration Locations
```
~/.mindmux/
├── mcp-servers.toml          # MCP server definitions
├── session-labels.json       # Persisted session labels
└── [other user configs]
```

## Error Handling Strategy

### Layer 1: Input Validation
```typescript
// Check path exists
if (!this.isValidPath(projectPath)) {
  throw new Error("Path not found: ...");
}

// Check tool selection is valid
if (!isValidTool(tool)) {
  throw new Error("Invalid tool: ...");
}
```

### Layer 2: Execution with Fallback
```typescript
try {
  const paneId = await this.createTmuxSession(...);
  await this.startTool(paneId, ...);
} catch (error) {
  // Layer 3: Cleanup on failure
  await this.cleanup(sessionName);
  throw; // Propagate with context
}
```

### Layer 3: User Feedback
```typescript
// Transform technical error into user message
const errorMsg = error instanceof Error ? error.message : String(error);
console.error(`✗ Failed to create session: ${errorMsg}`);

// Provide actionable steps
console.log("Troubleshooting:");
console.log("  • Verify project path exists");
console.log(`  • Ensure ${tool} is installed`);
```

## Future Architecture Considerations

### Scalability (Not Current)
If MindMux were to scale to multi-user scenarios:

```
MindMux Server (central)
    ├─ REST API
    ├─ WebSocket for real-time updates
    └─ SQLite persistence
    ↓
Multiple Clients (web-based TUI)
    ├─ Browser TUI via xterm.js
    ├─ Subscription to session updates
    └─ Action commands
```

### Current Limitation: Single-User, Single-Machine
- MindMux is designed for personal developer workflow
- One dashboard per user
- No server component
- No network communication

### Testing Architecture

**Unit Tests:**
- Session discovery logic (mocked tmux)
- Tool detection algorithms
- Input sanitization
- Error handling paths

**Integration Tests:**
- Full session creation workflow
- tmux interaction
- Configuration loading
- Requires actual tmux installation

**E2E Tests:**
- User workflows (attach, fork, label)
- Requires actual AI tool installations
- Manual testing for now

## Related Documentation

- [Codebase Summary](./codebase-summary.md) - Module overview and file organization
- [Code Standards](./code-standards.md) - Coding conventions and best practices
- [Development Roadmap](./development-roadmap.md) - Planned features and improvements
- [README.md](../README.md) - User-facing documentation and usage guide
