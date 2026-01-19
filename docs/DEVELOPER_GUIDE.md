# MindMux Developer Guide

Guide for contributing to MindMux development.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Code Standards](#code-standards)
4. [Testing](#testing)
5. [Contributing Process](#contributing-process)
6. [Debugging](#debugging)
7. [Common Tasks](#common-tasks)

## Development Setup

### Prerequisites

- Node.js 20+
- tmux 3.0+
- git
- TypeScript knowledge

### Clone and Install

```bash
git clone https://github.com/yourusername/mindmux.git
cd mindmux
npm install
```

### Build and Run

```bash
# Build TypeScript
npm run build

# Run CLI from built files
node dist/cli.js agent:list

# Or use npx
npx -y mindmux agent:list

# Type checking
npm run typecheck

# Run tests
npm test

# Watch mode (rebuild on changes)
npm run dev
```

### Useful Development Commands

```bash
# Clean build artifacts
npm run clean

# Full rebuild
npm run rebuild

# Check for issues
npm run lint

# Format code
npm run format

# Generate API docs
npm run generate-docs
```

## Project Structure

```
mindmux/
├── src/
│   ├── cli.ts                    # Main CLI entry point
│   ├── core/
│   │   ├── agent-manager.ts      # Agent CRUD operations
│   │   ├── config-manager.ts     # Configuration handling
│   │   ├── tmux-client.ts        # Tmux session management
│   │   ├── validators.ts         # Input validation
│   │   ├── persistence.ts        # File I/O operations
│   │   └── path-utils.ts         # Cross-platform path utilities
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   └── utils/
│       ├── logger.ts             # Logging utilities
│       └── index.ts              # General utilities
├── test/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test data
├── docs/                         # Documentation
├── dist/                         # Compiled JavaScript
├── package.json
├── tsconfig.json
└── jest.config.js
```

### Key Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | Main CLI commands, user interface |
| `src/core/agent-manager.ts` | Agent CRUD, status management |
| `src/core/config-manager.ts` | Config hierarchy, merging |
| `src/core/tmux-client.ts` | Tmux session lifecycle |
| `src/types/index.ts` | TypeScript interfaces |
| `test/` | All test files |

## Code Standards

### TypeScript

1. **Types First**: Always define types/interfaces
2. **Strict Mode**: Use `strict: true` in tsconfig.json
3. **No Any**: Avoid `any` type, use generics
4. **Descriptive Names**: Variable names should indicate purpose

```typescript
// Good
interface Agent {
  id: string;
  name: string;
  type: AgentType;
}

function createAgent(name: string, type: AgentType): Agent {
  // ...
}

// Avoid
interface A {
  x: any;
  y: any;
}

function create(a: any, b: any): any {
  // ...
}
```

### Style Guide

1. **Naming**:
   - `camelCase` for variables, functions
   - `PascalCase` for classes, interfaces
   - `UPPER_SNAKE_CASE` for constants
   - Descriptive names over abbreviations

2. **Functions**:
   - Keep functions small (<50 lines)
   - Single responsibility
   - Clear parameter types
   - Document complex logic

```typescript
/**
 * Create a new agent with validation
 * @param name - Agent name
 * @param type - Agent type
 * @returns Created agent or error
 */
function createAgent(name: string, type: AgentType): Result<Agent> {
  // ...
}
```

3. **Error Handling**:
   - Use try-catch for async operations
   - Throw descriptive errors
   - Include context in error messages

```typescript
try {
  const config = loadConfig();
  return config;
} catch (error) {
  throw new Error(`Failed to load config: ${error.message}`);
}
```

4. **Async/Await**:
   - Prefer async/await over promises
   - Use `.catch()` for error handling
   - Avoid callback hell

```typescript
// Good
async function startAgent(agentId: string): Promise<void> {
  try {
    const agent = await agentManager.getAgent(agentId);
    await tmuxClient.createSession(agent.name);
  } catch (error) {
    logger.error(`Failed to start agent: ${error.message}`);
  }
}

// Avoid
function startAgent(agentId: string) {
  agentManager.getAgent(agentId)
    .then(agent => tmuxClient.createSession(agent.name))
    .catch(error => console.error(error));
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- agent-manager.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Test Structure

Tests are organized by type:

```
test/
├── unit/              # Tests for individual functions
├── integration/       # Tests for component interactions
└── fixtures/          # Test data
```

### Writing Unit Tests

```typescript
// test/unit/agent-manager.test.ts
import { AgentManager } from '../../src/core/agent-manager';

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
  });

  describe('createAgent', () => {
    it('should create agent with valid inputs', () => {
      const agent = agentManager.createAgent('test-agent', 'claude', [
        'code-generation',
      ]);

      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('claude');
    });

    it('should reject invalid agent names', () => {
      expect(() => {
        agentManager.createAgent('invalid name!', 'claude', []);
      }).toThrow('Invalid agent name');
    });
  });
});
```

### Writing Integration Tests

```typescript
// test/integration/agent-workflow.test.ts
describe('Agent Workflow', () => {
  it('should create, start, and list agent', async () => {
    // Create
    const agent = agentManager.createAgent('test-agent', 'claude', []);
    expect(agent.id).toBeDefined();

    // List
    const agents = agentManager.listAgents();
    expect(agents).toContainEqual(agent);

    // Start
    await agentManager.startAgent(agent.id);
    const status = agentManager.getAgentStatus(agent.id);
    expect(status).toBe('running');

    // Cleanup
    await agentManager.stopAgent(agent.id);
  });
});
```

### Test Coverage Goals

- Minimum 80% overall coverage
- 100% coverage for critical paths (validation, persistence)
- Focus on behavior, not implementation

## Contributing Process

### 1. Create a Branch

```bash
git checkout -b feature/agent-capabilities
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code improvements

### 2. Make Changes

1. Write code following style guide
2. Add tests for new functionality
3. Update documentation
4. Run tests: `npm test`
5. Type check: `npm run typecheck`

### 3. Commit

Use conventional commits:

```
feat(agent): add capability filtering
fix(cli): handle missing config directory
docs(architecture): add diagram
refactor(config): simplify merging logic
test(agent-manager): add edge case tests
```

Format: `{type}({scope}): {description}`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Test additions
- `chore` - Build, dependencies

### 4. Push and Create PR

```bash
git push origin feature/agent-capabilities
```

Then create PR on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshots for UI changes
- Test results

### 5. Review and Merge

Address review comments and re-push. After approval, merge to main.

## Debugging

### Enable Debug Logging

```bash
# Set log level to debug
export MINDMUX_LOGGING_LEVEL=debug

# Run command
mux agent:list
```

### View Logs

```bash
# View all logs
cat ~/.mindmux/logs/mindmux.log

# Watch logs
tail -f ~/.mindmux/logs/mindmux.log

# Search logs
grep "ERROR" ~/.mindmux/logs/mindmux.log
```

### Debug Tmux Sessions

```bash
# List all tmux sessions
tmux list-sessions

# Attach to agent session
tmux attach -t mindmux-{agent-id}

# Kill session
tmux kill-session -t mindmux-{agent-id}
```

### Node Debugging

```bash
# Run with Node debugger
node --inspect-brk dist/cli.js agent:list

# Then open chrome://inspect in Chrome
```

### Common Issues

**Issue**: Command not found after install

```bash
# Rebuild and relink
npm run build
npm link
```

**Issue**: tmux session not found

```bash
# Check existing sessions
tmux list-sessions

# Or clean up old sessions
rm -rf ~/.mindmux/cache/sessions/
```

**Issue**: Tests failing

```bash
# Clean and rebuild
npm run clean
npm run build

# Re-run tests
npm test
```

## Common Tasks

### Add a New Command

1. **Define command in `src/cli.ts`**:

```typescript
program
  .command('agent:info <name>')
  .description('Get agent information')
  .action(async (name) => {
    try {
      const agent = await agentManager.getAgent(name);
      console.log(agent);
    } catch (error) {
      console.error(error.message);
    }
  });
```

2. **Add tests**:

```typescript
// test/unit/cli.test.ts
describe('agent:info command', () => {
  it('should display agent info', async () => {
    // Test implementation
  });
});
```

3. **Update docs**:

Add to [USER_GUIDE.md](./USER_GUIDE.md) and [CLI help](../GETTING_STARTED.md).

### Add a New Agent Type

1. **Update types** in `src/types/index.ts`:

```typescript
export type AgentType = 'claude' | 'gemini' | 'gpt4' | 'opencode' | 'new-type';
```

2. **Add defaults** in `src/core/config-manager.ts`:

```typescript
defaultModel: {
  // ...
  'new-type': 'new-type-model-v1',
}
```

3. **Update validation** in `src/core/validators.ts`

4. **Add tests**

### Add a New Capability

1. **Update types** in `src/types/index.ts`:

```typescript
export type Capability =
  | 'code-generation'
  | 'code-review'
  // ... other capabilities
  | 'new-capability';
```

2. **Update validation** in `src/core/validators.ts`

3. **Add tests and documentation**

### Modify Configuration Schema

1. **Add to types** in `src/types/index.ts`
2. **Add defaults** in `src/core/config-manager.ts`
3. **Add validation** in `src/core/validators.ts`
4. **Update docs** in [CONFIGURATION.md](./CONFIGURATION.md)
5. **Add tests** for new validation

## Performance Profiling

```bash
# Run with performance inspector
node --prof dist/cli.js agent:list

# Process the profile
node --prof-process isolate-*.log > profile.txt

# View profile
cat profile.txt
```

## Memory Profiling

```bash
# Enable memory profiling
export NODE_DEBUG_NATIVE=vm

# Run command
mux agent:list

# Check memory usage
ps aux | grep node
```

## Architecture Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- System design
- Component interactions
- Data flows
- Extension points

---

For questions or issues, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open a GitHub issue.

**Ready to contribute?** Start with `git checkout -b feature/your-feature` and follow the contributing process above!
