# MindMux

**AI Session Tracker** - Terminal session manager for Claude Code, Gemini CLI, OpenCode, and other AI coding agents.

[![npm version](https://badge.fury.io/js/mindmux.svg)](https://badge.fury.io/js/mindmux)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Auto-Discovery** - Automatically finds AI CLI sessions running in tmux
- 📊 **Real-Time Status** - Running ● | Waiting ◐ | Idle ○ | Error ✕
- 🍴 **Session Forking** - Clone conversations with full history
- 🔌 **MCP Management** - Toggle Model Context Protocol servers per-session
- 🏷️ **Session Labels** - Organize sessions with custom tags
- 🔎 **Search & Filter** - Find sessions by label, path, or tool type
- ⌨️ **Keyboard Driven** - Vim-style navigation (j/k)

## Quick Start

```bash
# Install
npm install -g mindmux

# Start an AI tool in tmux
tmux new -s my-session
claude code  # or: gemini chat, opencode, cursor, aider

# In another terminal, launch MindMux
mindmux

# Navigate with j/k, press Enter to attach, f to fork, m for MCPs
```

## Installation

### Prerequisites

- **tmux** (3.0+): `brew install tmux` (macOS) or `apt install tmux` (Linux)
- **Node.js** (18+): `brew install node` or [download](https://nodejs.org/)
- **AI CLI tools**: Claude Code, Gemini CLI, OpenCode, etc.

### Install MindMux

```bash
npm install -g mindmux
```

## Usage

### Interactive TUI (Default)

```bash
mindmux  # Launch dashboard
```

**Keyboard Shortcuts:**
- `j/k` or `↓/↑` - Navigate sessions
- `Enter` - Attach to session
- `n` - Create new session
- `f` - Fork session (clone with history)
- `m` - Manage MCP servers
- `l` - Label session
- `/` - Search/filter
- `h` or `?` - Help
- `q` or `Ctrl+C` - Quit

### CLI Commands

```bash
# List all AI sessions
mindmux list

# Filter by tool type
mindmux list --type claude

# Filter by status
mindmux list --status running

# Attach to specific session
mindmux attach %0  # Use pane ID from list
```

## Configuration

### MCP Servers

Define MCP servers in `~/.mindmux/mcp-servers.toml`:

```toml
[mcp.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
scope = "local"  # local = per-project, global = all sessions

[mcp.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
scope = "global"

[mcp.github.env]
GITHUB_TOKEN = "ghp_your_token"
```

Toggle MCPs in TUI with `m` key.

### Session Labels

Labels are stored in `~/.mindmux/session-labels.json` and persist across restarts.

## Examples

### Workflow: Clone a Conversation

```bash
# Start Claude in tmux
tmux new -s feature-dev
claude code

# Have a conversation with Claude
> Implement authentication with JWT

# In another terminal, fork the conversation
mindmux
# Navigate to feature-dev session, press 'f'
# New session created with full conversation history
```

### Workflow: Create New Session

```bash
# Launch MindMux
mindmux

# Press 'n' to create new session
# Select AI tool (1-6)
# Enter project path or press Enter for current directory
# Optionally add a session label
# MindMux creates tmux session and starts AI tool
```

### Workflow: MCP Toggle

```bash
# Launch MindMux
mindmux

# Navigate to session, press 'm'
# Select MCP server to toggle
# Confirm restart
# AI tool restarts with MCP enabled
```

## Supported AI Tools

- **Claude Code** - Anthropic's CLI coding agent
- **Gemini CLI** - Google's Gemini command-line interface
- **OpenCode** - Open-source AI coding assistant
- **Cursor** - AI-powered code editor CLI
- **Aider** - AI pair programming tool
- **Codex** - OpenAI Codex CLI

## Comparison with Agent-Deck

MindMux v2 is inspired by [agent-deck](https://github.com/asheshgoplani/agent-deck) but built in TypeScript for Node.js developers:

| Feature | Agent-Deck | MindMux v2 |
|---------|------------|------------|
| Language | Go + Bubble Tea | TypeScript + @clack/prompts |
| Session Discovery | ✅ | ✅ |
| Status Detection | ✅ | ✅ |
| Session Forking | ✅ | ✅ |
| MCP Management | ✅ | ✅ |
| Package Manager | Go install | npm install |

## Troubleshooting

### No sessions found

- Ensure tmux is running: `tmux ls`
- Ensure AI tool is running in tmux session
- Check tool process name matches detection patterns

### Fork fails

- Verify tmux allows pane splitting
- Check AI tool can restart in same directory
- Increase fork timeout if tool initialization is slow

### MCP toggle fails

- Verify MCP configuration syntax in TOML
- Check MCP server command is valid
- Ensure AI tool supports MCP protocol

## Development

```bash
# Clone repo
git clone https://github.com/yourusername/mindmux.git
cd mindmux

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js
```

## License

MIT © 2026

## Credits

- Inspired by [agent-deck](https://github.com/asheshgoplani/agent-deck)
- Built with [@clack/prompts](https://github.com/natemoo-re/clack)
