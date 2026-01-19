# Code Standards & Codebase Structure

**Last Updated:** 2026-01-19 | **Version:** 2.1.0

## Code Organization Principles

### YAGNI (You Aren't Gonna Need It)
- Implement only features explicitly required
- No speculative abstraction layers
- No unused configuration options
- Focus on core session tracking functionality

### KISS (Keep It Simple, Stupid)
- Prefer simple, readable code over clever optimizations
- Use straightforward algorithms and data structures
- Minimize indirection and abstraction levels
- Avoid over-engineering

### DRY (Don't Repeat Yourself)
- Extract common patterns into utility functions
- Shared tmux operations in `TmuxController`
- Shared tool configuration in `tool-commands.ts`
- Reusable UI components and formatters

## Naming Conventions

### Files
- **Format:** `kebab-case` with descriptive purpose
- **Examples:**
  - `session-creator.ts` - Session creation logic
  - `ai-tool-detector.ts` - Tool detection logic
  - `tmux-controller.ts` - Tmux operations wrapper
  - `status-detector.ts` - Status detection logic

**Rationale:** LLM tools (Grep, Glob) benefit from self-documenting filenames that clearly describe purpose.

### Classes
- **Format:** `PascalCase`
- **Examples:** `SessionCreator`, `TmuxController`, `StatusDetector`

### Functions
- **Format:** `camelCase`
- **Examples:** `createSession()`, `detectStatus()`, `getToolStartCommand()`

### Variables
- **Constants:** `UPPER_SNAKE_CASE`
  - Example: `MAX_SESSION_NAME_LENGTH = 200`
- **Regular:** `camelCase`
  - Example: `sessionName`, `projectPath`

### Type Definitions
- **Format:** `PascalCase` or `camelCase` based on TypeScript convention
- **Examples:**
  ```typescript
  type AITool = 'claude' | 'gemini' | 'opencode' | 'cursor' | 'aider' | 'codex';
  interface Session { id: string; tool: AITool; }
  interface CreateSessionOptions { tool: AITool; projectPath: string; }
  ```

## File Organization

### Module Structure
Each module follows consistent structure:

```typescript
/**
 * Module description
 * Purpose and key responsibilities
 */

// Imports (group: types, then dependencies, then local)
import { execSync } from 'child_process';
import type { AITool } from '../types/index.js';

// Types & Interfaces
export interface CreateSessionOptions { }
export interface CreateSessionResult { }

// Utility Functions (if any)
function sanitizeShellArg(arg: string): string { }

// Main Export Class or Functions
export class SessionCreator {
  constructor(private tmux: TmuxController) {}

  async createSession(options: CreateSessionOptions): Promise<CreateSessionResult> { }

  // Private methods follow public methods
  private async createTmuxSession(): Promise<string> { }
}
```

### Directory Organization
```
src/
├── config/           # Configuration loading (external files, env)
├── core/             # Core infrastructure (tmux controller)
├── discovery/        # Session/tool detection (passive scanning)
├── operations/       # User-initiated operations (fork, create, MCP)
├── tui/              # Terminal UI (dashboard, input, rendering)
├── types/            # TypeScript type definitions
└── cli.ts            # Entry point
```

## Error Handling

### Exception Strategy
- **Catch-and-transform pattern:** Catch low-level errors, wrap with context
- **User-friendly messages:** Include troubleshooting guidance
- **Structured errors:** Preserve original error for debugging

### Example: Session Creation
```typescript
try {
  // Validate path
  if (!this.isValidPath(projectPath)) {
    throw new Error(`Path not found: ${projectPath}\nPlease check the path exists...`);
  }

  // Create session
  const paneId = await this.createTmuxSession(sessionName, projectPath);

  // Start tool
  await this.tmux.sendKeys(paneId, startCommand);

} catch (error) {
  // Cleanup on failure
  await this.cleanup(sessionName);

  // Transform error for user
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`✗ Failed: ${errorMsg}`);

  // Return structured result
  return { sessionName, paneId: '', success: false, error: errorMsg };
}
```

### Error Messages Format
1. **Clear problem statement:** What failed
2. **Why it failed:** Root cause or validation error
3. **How to fix it:** Actionable troubleshooting steps

### Example Error Output
```
✗ Failed to create session: Path not found: /invalid/path
Please check the path exists and try again.

Troubleshooting:
  • Verify project path exists
  • Ensure claude is installed
  • Check tmux is running
```

## Type Safety

### TypeScript Configuration
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true
}
```

### Interface-Based Design
- Define clear interfaces for each module
- Export types in `src/types/index.ts`
- Use `readonly` for immutable data
- Avoid `any` type (use `unknown` if needed)

### Example Interface Pattern
```typescript
// Define contract
export interface CreateSessionOptions {
  tool: AITool;
  projectPath: string;
  label?: string;
}

export interface CreateSessionResult {
  sessionName: string;
  paneId: string;
  success: boolean;
  error?: string;
}

// Implement with type safety
export class SessionCreator {
  async createSession(options: CreateSessionOptions): Promise<CreateSessionResult> {
    // All fields are typed; TypeScript ensures correctness
  }
}
```

## Security Practices

### Input Sanitization
**Rule:** All external input must be sanitized before shell execution.

**Implementation in `session-creator.ts`:**
```typescript
function sanitizeShellArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$()<>'"\\]/g, '');
}

// Usage:
const safeName = sanitizeShellArg(sessionName);
execSync(`tmux new-session -s "${safeName}" ...`);
```

**Protected Characters:** `;`, `&`, `|`, backtick, `$`, `(`, `)`, `<`, `>`, `'`, `"`, `\`

### Input Validation
**Rule:** Validate input before processing.

**Checks in `session-creator.ts`:**
- Path exists: `fs.statSync(path).isDirectory()`
- Path is directory: Guard against files
- Session name length: Max 200 characters
- Project path length: Max 500 characters

### Environment Isolation
- Each session runs in separate tmux pane
- No environment sharing between sessions
- Working directory scoped per session
- Process names detected from actual tmux output (untrusted input sanitized before use)

## Code Style Guidelines

### Line Length
- **Target:** 100 characters per line
- **Hard limit:** 120 characters for readability
- **Exception:** Long strings in comments/docs allowed to exceed

### Spacing & Formatting
```typescript
// Space around operators
const x = 1 + 2;

// Space after control keywords
if (condition) { }
for (let i = 0; i < n; i++) { }

// Consistent indentation (2 spaces)
function example() {
  if (true) {
    console.log('nested');
  }
}

// Line breaks for long conditionals
if (condition1 && condition2 &&
    condition3 && condition4) {
  // ...
}
```

### Comments
- **Purpose, not what:** Explain why, not what the code does
- **JSDocs for exports:** Document public interfaces
- **Inline sparingly:** Code should be self-documenting

**Good Comment:**
```typescript
/**
 * Sanitize shell arguments to prevent command injection
 */
function sanitizeShellArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$()<>'"\\]/g, '');
}
```

**Avoid Comment:**
```typescript
// Remove special characters from arg
// Not helpful; the code already shows this
arg = arg.replace(/[;&|`$()<>'"\\]/g, '');
```

### Async/Await
- Always mark async functions with `async` keyword
- Use `await` for Promise-returning functions
- Avoid Promise chains (use async/await for readability)

```typescript
// Good
async function createSession(): Promise<CreateSessionResult> {
  const paneId = await this.tmux.sendKeys(...);
  const ready = await this.waitForToolReady(paneId);
  return { sessionName, paneId, success: true };
}

// Avoid (Promise chains)
function createSession(): Promise<CreateSessionResult> {
  return this.tmux.sendKeys(...)
    .then(paneId => this.waitForToolReady(paneId))
    .then(ready => ({ sessionName, paneId, success: true }));
}
```

## Testing Strategy

### Test Organization
- **Location:** Co-located with source files (`*.test.ts`)
- **Coverage target:** >80% branch coverage
- **Framework:** Vitest

### Test Pattern: Arrange-Act-Assert
```typescript
describe('SessionCreator', () => {
  it('should create session with valid path', async () => {
    // Arrange
    const creator = new SessionCreator(mockTmux);
    const options = { tool: 'claude', projectPath: '/tmp' };

    // Act
    const result = await creator.createSession(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.sessionName).toContain('mindmux-claude');
  });
});
```

### Test Coverage Areas
1. **Happy Path:** Normal operation with valid inputs
2. **Error Cases:** Invalid paths, missing tools, tmux failures
3. **Edge Cases:** Empty strings, very long names, special characters
4. **Security:** Input sanitization effectiveness, injection prevention

## Performance Considerations

### Acceptable Latency
| Operation | Target | Notes |
|-----------|--------|-------|
| Session scan | <200ms | User waits for list |
| Status refresh | <100ms | Per-session check |
| Dashboard render | <50ms | UI redrawn frequently |
| Session create | <10s | One-time operation, user expects wait |

### Optimization Strategies
1. **Caching:** Session list cached between refresh cycles
2. **Debouncing:** Rapid status updates coalesced
3. **Lazy Loading:** Tool info loaded only when needed
4. **Efficient Parsing:** ANSI removal and whitespace normalization in one pass

### Anti-Patterns to Avoid
- Recursive filesystem traversal for tool detection (use `ps` instead)
- Polling all panes every time (use `tmux list-panes` once per cycle)
- Synchronous I/O in tight loops (use async/await)
- Large string concatenations (use template literals)

## Modularity Checklist

Before adding code, verify:

- [ ] **Single Responsibility:** Does this module do one thing well?
- [ ] **Clear Interface:** Are exports well-defined via interfaces?
- [ ] **Reusability:** Can this be used by multiple callers?
- [ ] **Testability:** Can this be unit tested in isolation?
- [ ] **Documentation:** Is the purpose clear from name + comments?
- [ ] **File Size:** Is the file <200 lines? (If not, split module)
- [ ] **Dependencies:** Are external dependencies minimized?

## Breaking Changes Protocol

When making breaking changes:

1. **Deprecate first** (if possible):
   - Keep old API working
   - Add deprecation comment
   - Document migration path

2. **Document in CHANGELOG.md**:
   ```markdown
   ## [X.Y.Z]
   ### Changed
   - [BREAKING] Remove old API - use new API instead
   ```

3. **Update major version** (follow semver)

4. **Provide migration guide** in docs if substantial

## Related Documentation

- [System Architecture](./system-architecture.md) - Design patterns and interactions
- [Codebase Summary](./codebase-summary.md) - Module overview and data flows
- [Development Roadmap](./development-roadmap.md) - Planned improvements
