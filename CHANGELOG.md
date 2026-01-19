# Changelog

All notable changes to MindMux will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-19

### Added
- Session creation wizard with 'n' key in TUI dashboard
- Interactive workflow: tool selection → path input → optional label
- Support for creating sessions with 6 AI tools: Claude Code, Gemini CLI, OpenCode, Cursor, Aider, Codex
- Comprehensive path validation and AI tool initialization detection
- Session creation success/error feedback with troubleshooting guidance

### Security
- Command injection prevention via shell argument sanitization
- Input validation with max length enforcement (session name: 200 chars, path: 500 chars)
- Safe tmux command execution with proper quoting

## [2.0.0] - 2026-01-19

### Added
- Complete architectural rewrite as passive session tracker
- Auto-discovery of AI CLI sessions (Claude, Gemini, OpenCode, Cursor, Aider, Codex)
- Real-time status detection (Running ● | Waiting ◐ | Idle ○ | Error ✕)
- Interactive TUI dashboard with vim-style navigation
- Session forking with full conversation history
- MCP server management (toggle per-session)
- Session labeling and search/filter with real-time filtering
- Keyboard shortcuts (j/k, Enter, f, m, l, /, h/?, q)
- Help screen with comprehensive shortcut reference
- Enhanced search mode with backspace support

### Changed
- [BREAKING] Complete rewrite from orchestrator to tracker pattern
- [BREAKING] Removed task queue, load balancing, orchestration features
- Simplified from 5,000+ lines to ~500 lines
- Changed from active controller to passive observer
- Improved keyboard handler with better key parsing
- Enhanced TUI with clearer footer and status indicators

### Removed
- Task queue management
- Agent creation/spawning
- Load balancing and capability matching
- SQLite persistence (replaced with JSON labels)
- Security layer (RBAC, encryption)
- HTTP API and monitoring

## [1.0.0] - 2026-01-18

### Added
- Multi-agent orchestrator with task queue
- Support for Claude, Gemini, GPT-4, OpenCode
- SQLite persistence with in-memory cache
- RBAC security with AES-256 encryption
- HTTP API with SSE event streaming
- Prometheus metrics and Grafana dashboard
- 98 tests with 82% coverage
- Docker containerization
- GitHub Actions CI/CD

**Note:** v1 archived as `archive/mindmux-v1-orchestrator` tag
