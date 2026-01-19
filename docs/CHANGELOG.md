# MindMux Changelog

All notable changes to MindMux are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### In Progress

- Phase 10: Documentation & Developer Experience (in progress)

## [0.1.0] - 2025-01-19

### Major Milestones

**Phases 1-4 Complete:** Foundation through task orchestration

#### Phase 1: Foundation & Core CLI

- ✅ CLI command framework using Commander.js
- ✅ Agent CRUD operations (create, list, get, update, delete)
- ✅ Configuration management with hierarchy
- ✅ Input validation for agents and config
- ✅ Cross-platform path utilities
- ✅ File-based persistence

#### Phase 2: Tmux Integration & Session Management

- ✅ Tmux session creation and lifecycle management
- ✅ Real-time log streaming from agent sessions
- ✅ Session persistence (survive CLI process exit)
- ✅ Graceful shutdown handling
- ✅ Process status tracking

#### Phase 3: AI Provider Integration

- ✅ Claude provider support
- ✅ Gemini provider support
- ✅ GPT-4 provider support
- ✅ OpenCode provider support
- ✅ Capability mapping per provider
- ✅ Model selection and defaults

#### Phase 4: Task Orchestration Framework

- ✅ Task queue implementation
- ✅ Task status tracking (queued, running, completed, failed)
- ✅ Priority levels for tasks
- ✅ Task history and logging
- ✅ Completion callbacks

### Added

#### CLI Commands

- `agent:create` - Create new AI agent
- `agent:list` - List all agents with status
- `agent:get` - Get agent details
- `agent:update` - Update agent properties
- `agent:delete` - Delete agent
- `agent:start` - Start agent in tmux session
- `agent:stop` - Stop running agent
- `agent:status` - Check agent status
- `agent:logs` - View agent logs
- `config:show` - Display merged configuration

#### Features

- Multi-provider support (Claude, Gemini, GPT-4, OpenCode)
- 8 capability types (code-generation, code-review, testing, debugging, documentation, planning, research, refactoring)
- Configuration hierarchy (env vars > project > global > defaults)
- Persistent tmux sessions
- Real-time log streaming with follow mode
- Agent status tracking (idle, busy, error)

### Configuration

- `~/.mindmux/config.json` - Global configuration
- `./.mindmux/config.json` - Project-local overrides
- Environment variables - Runtime overrides

#### Config Options

- `defaultAgentType` - Default provider
- `defaultModel` - Model per provider
- `timeout` - Task timeout in ms
- `maxConcurrentAgents` - Concurrent agent limit
- `logging.level` - Log level (debug, info, warn, error)
- `logging.enableAgentLogs` - Per-agent log files
- `logging.maxLogSizeMB` - Log rotation size
- `tmux.sessionPrefix` - Session name prefix
- `tmux.keepSessionsAlive` - Persist sessions

### Storage

- `~/.mindmux/config.json` - Global config
- `~/.mindmux/agents.json` - Agent registry
- `~/.mindmux/metadata.json` - CLI metadata
- `~/.mindmux/logs/agents/{id}.log` - Per-agent logs
- `~/.mindmux/cache/sessions/` - Session state cache

### Documentation

- User guide covering all CLI commands
- Installation and quick start guide
- Configuration reference
- Architecture documentation
- Developer guide
- Deployment guide (systemd, Docker)
- Troubleshooting guide
- FAQ with common questions
- Security documentation
- API documentation (OpenAPI spec)
- Example configurations and workflows
- Docker Compose example

### Examples

- `docs/examples/agent-configs.json` - Example agent definitions
- `docs/examples/task-workflows.sh` - Example workflows
- `docs/examples/docker-compose.yml` - Docker setup

### Developer Experience

- TypeScript strict mode
- ESLint and Prettier configuration
- Jest test framework setup
- GitHub Actions CI/CD pipeline
- Pre-commit hooks
- Comprehensive error messages

### API Documentation (Planned)

- OpenAPI 3.0 specification
- REST endpoints for health, status, agents, events
- Server-Sent Events streaming

## [0.0.0] - 2025-01-15

### Initial Setup

- Project initialization
- Repository structure
- Development environment setup
- Dependencies configured
- Initial build pipeline

---

## Migration Guide

### From 0.0.0 to 0.1.0

First release. No migration needed.

---

## Roadmap

### Phase 5 (Weeks 5-6)

- [ ] Terminal User Interface (TUI) with dashboard
- [ ] Interactive agent management
- [ ] Real-time status display

### Phase 6 (Weeks 6-7)

- [ ] HTTP REST API server
- [ ] Server-Sent Events for live updates
- [ ] Client libraries

### Phase 7 (Week 8)

- [ ] Multi-user authentication (OAuth, JWT)
- [ ] Role-based access control
- [ ] User management

### Phase 8 (Week 8)

- [ ] Encryption at rest and in transit
- [ ] Security hardening
- [ ] Compliance (SOC2, OWASP)

### Phase 9 (Week 9)

- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Load testing

### Phase 11 (Week 10)

- [ ] Kubernetes deployment
- [ ] CI/CD integration
- [ ] Monitoring and alerting

### Phase 12 (Weeks 11+)

- [ ] PostgreSQL support
- [ ] Distributed deployments
- [ ] Plugin system

---

## Known Issues

### Phase 1-4

1. **Limited scalability** - File-based storage for <1000 agents
2. **No persistence between sessions** - Workflow state lost
3. **Single machine only** - No distributed support
4. **No multi-user** - Single user per installation
5. **Basic error messages** - Limited context in some errors

### Tracked in GitHub Issues

- See [GitHub Issues](https://github.com/yourusername/mindmux/issues)

---

## Contributors

### Phase 1-4 Contributors

- **Core Team** - Foundation and core features
- **Community** - Bug reports and feedback

See [GitHub Contributors](https://github.com/yourusername/mindmux/graphs/contributors)

---

## Support

### Getting Help

- **Docs:** [docs/](./docs/)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **FAQ:** [FAQ.md](./FAQ.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/mindmux/issues)

### Reporting Bugs

1. Check existing issues
2. Create detailed reproduction
3. Include system info and logs
4. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for diagnostic info

### Suggesting Features

1. Check existing discussions
2. Post in [GitHub Discussions](https://github.com/yourusername/mindmux/discussions)
3. Describe use case and requirements

---

## License

MindMux is licensed under the MIT License.

See [LICENSE](../LICENSE) for details.

---

## Version Numbering

Uses semantic versioning: MAJOR.MINOR.PATCH

- **Major** - Breaking changes (phases)
- **Minor** - New features (within phase)
- **Patch** - Bug fixes

Example: 1.2.3 = Major 1, Minor 2, Patch 3

---

**Last Updated:** January 19, 2025

**Next Release:** Phase 5 complete (estimated early February 2025)
