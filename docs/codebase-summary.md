# MindMux Codebase Summary

**Last Updated:** 2026-01-19 | **Version:** 2.1.0

## Overview

MindMux is an AI session tracker for Terminal User Interface (TUI) dashboard management. It auto-discovers and tracks AI CLI sessions running in tmux, providing real-time status, session forking, MCP management, and interactive session creation.

**Architecture Pattern:** Passive session tracker with event-driven TUI

## Directory Structure

```
src/
├── cli.ts                           # CLI entry point
├── config/                          # Configuration management
│   └── config-loader.ts             # Load user config from ~/.mindmux
├── core/                            # Core tmux integration
│   └── tmux-controller.ts           # Low-level tmux operations
├── discovery/                       # Session discovery
│   ├── ai-tool-detector.ts          # Identify AI tools in processes
│   ├── session-scanner.ts           # Scan tmux sessions
│   └── status-detector.ts           # Real-time status detection
├── operations/                      # Session operations
│   ├── conversation-parser.ts       # Parse tmux pane output
│   ├── mcp-manager.ts               # Toggle MCP servers per-session
│   ├── session-creator.ts           # Create new tmux sessions
│   ├── session-fork.ts              # Clone sessions with history
│   └── tool-commands.ts             # AI tool command/timeout config
├── tui/                             # Terminal UI components
│   ├── dashboard.ts                 # Main interactive dashboard
│   ├── keyboard-handler.ts          # Vim-style keyboard input
│   └── utils/                       # UI utilities
│       ├── colors.ts                # ANSI color helpers
│       └── formatters.ts            # Output formatting
└── types/                           # TypeScript type definitions
    └── index.ts                     # AITool, Session, Status types
```

## Core Modules

### Config Management (`config/config-loader.ts`)

Loads user configuration from `~/.mindmux/` directory.

**Key Methods:**
- `loadConfig()` - Load MCP server definitions from `mcp-servers.toml`
- `loadLabels()` - Load session labels from `session-labels.json`

**Files Used:**
- `~/.mindmux/mcp-servers.toml` - MCP server configuration
- `~/.mindmux/session-labels.json` - Persisted session labels

### Tmux Controller (`core/tmux-controller.ts`)

Low-level tmux command wrapper. Executes shell commands via `execSync`.

**Key Methods:**
- `listPanes(sessionId)` - Get all panes in session
- `sendKeys(paneId, keys)` - Send keystrokes to pane
- `captureOutput(paneId, lines)` - Capture pane content
- `splitPane(paneId, vertical)` - Split pane
- `switchClient(sessionId)` - Attach to session

### AI Tool Detection (`discovery/ai-tool-detector.ts`)

Identifies AI tools by process name matching.

**Supported Tools:**
- `claude` - Claude Code CLI
- `gemini` - Google Gemini CLI
- `opencode` - Open-source AI coding
- `cursor` - Cursor AI editor
- `aider` - AI pair programming
- `codex` - OpenAI Codex CLI

**Pattern Matching:** Uses regex to detect tool processes: `/\b(claude|gemini|opencode|cursor|aider|codex)\b/i`

### Session Discovery (`discovery/session-scanner.ts`)

Scans tmux sessions and associates panes with AI tools.

**Workflow:**
1. List all tmux sessions
2. For each session, list panes
3. Get process name for each pane
4. Match against AI tool patterns
5. Return array of detected sessions

### Status Detection (`discovery/status-detector.ts`)

Detects real-time session status based on pane content.

**Status States:**
- `●` Running - Process in foreground, receiving input
- `◐` Waiting - Pane idle but process running
- `○` Idle - No active process
- `✕` Error - Process exited with error

**Detection Method:** Checks pane output for status indicators and process state.

### Session Creator (`operations/session-creator.ts`)

Creates new tmux sessions with AI tools using interactive wizard.

**Key Class:** `SessionCreator`

**Methods:**
- `createSession(options)` - Create new session with validation
  - Validates project path exists
  - Creates tmux session in project directory
  - Starts AI tool with proper initialization timeout
  - Waits for tool readiness before returning
  - Auto-cleanup on failure

**Security Features:**
- Shell argument sanitization (removes: `;`, `&`, `|`, `` ` ``, `$`, `(`, `)`, `<`, `>`, `'`, `"`, `\`)
- Input length validation (session name max 200 chars, path max 500 chars)
- Path validation using `fs.statSync()` before session creation

**Error Handling:**
- Path not found error with helpful message
- Tool not installed detection with installation instructions
- Graceful session cleanup on failure

### Session Forking (`operations/session-fork.ts`)

Clones session with full conversation history.

**Workflow:**
1. Get pane content from source session
2. Create new session with same tool
3. Replay conversation history
4. Return new session ID

### Tool Commands (`operations/tool-commands.ts`)

Tool-specific configuration: start commands and initialization timeouts.

**Exports:**
- `getToolStartCommand(tool, projectPath)` - Command to start tool
- `getToolInitTimeout(tool)` - Milliseconds to wait for initialization
- `isToolReady(tool, output)` - Check if tool is responsive

**Tool Timeouts:**
- `claude` - 8000ms
- `gemini` - 5000ms
- `opencode` - 6000ms
- `cursor` - 10000ms
- `aider` - 7000ms
- `codex` - 5000ms

### MCP Manager (`operations/mcp-manager.ts`)

Toggles Model Context Protocol (MCP) servers per-session.

**Workflow:**
1. Load MCP server config from `~/.mindmux/mcp-servers.toml`
2. Show available servers to user
3. Toggle selected servers (enable/disable)
4. Restart AI tool with updated MCP config

### Conversation Parser (`operations/conversation-parser.ts`)

Parses tmux pane output to extract conversation history.

**Features:**
- ANSI escape code removal
- Whitespace normalization
- Message boundary detection

### Dashboard TUI (`tui/dashboard.ts`)

Main interactive interface. ~530 lines.

**Key Methods:**
- `render()` - Draw session list with status indicators
- `handleKeypress(key)` - Process keyboard input
- `refresh()` - Poll for session updates
- `createNewSession()` - Launch session creation wizard
- `attachSession(sessionId)` - Attach to selected session
- `forkSession(sessionId)` - Clone selected session
- `labelSession(sessionId)` - Add/edit session label
- `manageMcp(sessionId)` - Toggle MCP servers
- `searchSessions(query)` - Filter by label/path/tool

**Keyboard Controls:**
| Key | Action |
|-----|--------|
| `j`, `↓` | Navigate down |
| `k`, `↑` | Navigate up |
| `Enter` | Attach to session |
| `n` | Create new session |
| `f` | Fork session |
| `m` | Manage MCPs |
| `l` | Label session |
| `/` | Search sessions |
| `h`, `?` | Show help |
| `q`, `Ctrl+C` | Quit |

**Session Creation Wizard (n key):**
1. Prompt for AI tool selection (1-6)
2. Prompt for project path (default: cwd)
3. Optional label entry
4. Call `SessionCreator.createSession()`
5. Display result with troubleshooting guidance

### Keyboard Handler (`tui/keyboard-handler.ts`)

Low-level raw mode input handling.

**Features:**
- Raw mode stdin
- Non-blocking key capture
- Vim-style keybinding support

### Types (`types/index.ts`)

TypeScript definitions used throughout codebase.

**Key Types:**
```typescript
type AITool = 'claude' | 'gemini' | 'opencode' | 'cursor' | 'aider' | 'codex';

type SessionStatus = 'running' | 'waiting' | 'idle' | 'error';

interface Session {
  id: string;           // pane ID
  tool: AITool;
  status: SessionStatus;
  projectPath: string;
  label?: string;
}

interface MCP {
  name: string;
  command: string;
  args: string[];
  scope: 'local' | 'global';
}
```

## Data Flow

### Session Discovery Flow
```
main()
  ↓
SessionScanner.scan()
  ├─ tmux ls (list sessions)
  ├─ For each session:
  │   ├─ tmux list-panes (get panes)
  │   └─ ps lookup (get process names)
  ├─ AIToolDetector.identify() (pattern match)
  └─ return Session[]
  ↓
Dashboard.render() (display with status icons)
```

### Session Creation Flow (n key)
```
Dashboard.handleKeypress('n')
  ↓
promptForTool() (1-6 selection)
  ↓
promptForPath() (readline input)
  ↓
promptForNewLabel() (optional)
  ↓
SessionCreator.createSession()
  ├─ isValidPath() (validate directory exists)
  ├─ createTmuxSession() (tmux new-session)
  ├─ sendKeys() (send start command)
  ├─ waitForToolReady() (poll with timeout)
  └─ return CreateSessionResult
  ↓
Display result with feedback
```

### Status Detection Flow
```
Dashboard.refresh() (every 500ms)
  ↓
StatusDetector.detect()
  ├─ captureOutput() (get pane content)
  ├─ Check for status indicators
  ├─ Check process state
  └─ return SessionStatus
  ↓
Update session list display
```

## File Size & Complexity

| Module | File | Size | Purpose |
|--------|------|------|---------|
| CLI | cli.ts | ~50 lines | Entry point |
| Config | config-loader.ts | ~80 lines | Config loading |
| Core | tmux-controller.ts | ~150 lines | Tmux wrapper |
| Discovery | ai-tool-detector.ts | ~60 lines | Tool detection |
| Discovery | session-scanner.ts | ~100 lines | Session scanning |
| Discovery | status-detector.ts | ~80 lines | Status detection |
| Operations | session-creator.ts | ~178 lines | Session creation |
| Operations | session-fork.ts | ~120 lines | Session forking |
| Operations | mcp-manager.ts | ~150 lines | MCP toggle |
| Operations | conversation-parser.ts | ~60 lines | Parsing |
| Operations | tool-commands.ts | ~90 lines | Tool config |
| TUI | dashboard.ts | ~530 lines | Main interface |
| TUI | keyboard-handler.ts | ~70 lines | Input handling |
| Utils | colors.ts | ~40 lines | Color helpers |
| Utils | formatters.ts | ~80 lines | Formatting |
| Types | index.ts | ~50 lines | Type definitions |

**Total:** ~2,000 LOC (lightweight, single-purpose modules)

## Dependencies

**Production:**
- `@clack/prompts` - Interactive prompts
- `chalk` - Terminal colors
- `dotenv` - Environment variables
- `toml` - Parse MCP config

**Development:**
- `typescript` - Type checking
- `@types/node` - Node type definitions
- `vitest` - Unit testing
- `@typescript-eslint/*` - Linting

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Scan sessions | ~100ms | tmux ls + process lookup |
| Detect status | ~50ms | pane capture |
| Create session | ~5000ms | includes tool initialization |
| Refresh dashboard | ~500ms | configurable interval |

## Security Considerations

1. **Command Injection Prevention**
   - Shell arguments sanitized in `session-creator.ts`
   - Removes dangerous characters: `;`, `&`, `|`, backtick, `$`, parentheses, brackets, quotes
   - Length limits enforced (200 for session name, 500 for path)

2. **Input Validation**
   - Path validation uses `fs.statSync()` before tmux commands
   - Tool selection limited to predefined enum
   - MCP config loaded from user directory only

3. **Process Isolation**
   - Each session runs in separate tmux session
   - No shared environment between sessions
   - Process names from actual tmux panes (not user input)

## Testing

**Test Suite:** `vitest` configuration in `vitest.config.ts`

**Coverage Areas:**
- Session discovery accuracy
- Status detection correctness
- MCP configuration parsing
- Session creation with various tool types
- Error handling and cleanup

**Run Tests:**
```bash
npm test
npm run test:coverage
```

## Future Enhancements

1. **Persistence:** Store session metadata in SQLite
2. **Session History:** Auto-save conversation snapshots
3. **Team Features:** Share session configs via Git
4. **Analytics:** Track session duration, tool usage
5. **Automation:** Session templates, scheduled creation

## Known Limitations

1. **tmux Only:** Requires tmux 3.0+
2. **AI Tool Installation:** Tools must be in PATH
3. **Single Dashboard:** One TUI instance per user
4. **TOML Config:** Manual config editing required (no GUI)
5. **macOS/Linux:** Tested on Darwin; Windows support via WSL

## Related Documentation

- [System Architecture](./system-architecture.md) - Design patterns and component interactions
- [Code Standards](./code-standards.md) - Naming conventions and code style
- [Development Roadmap](./development-roadmap.md) - Planned features and phases
