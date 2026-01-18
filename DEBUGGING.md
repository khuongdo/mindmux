# Debugging MindMux

This guide covers debugging MindMux CLI locally during development.

## Prerequisites

- **Node.js 24+** (configured via Volta)
- **VS Code** (recommended for best debugging experience)
- **tmux** (for session management testing)

## Quick Start

### Install Dependencies
```bash
npm install
```

### Build Project
```bash
npm run build
```

### Run CLI
```bash
# Run built version
npm start -- --help

# Run with auto-reload (development)
npm run dev -- --help
```

## Debugging Methods

### 1. VS Code Debugger (Recommended)

Press `F5` or go to **Run and Debug** panel and select:

**Available Configurations:**
- **Debug CLI** - Debug general CLI with `--help`
- **Debug TUI** - Debug Terminal UI
- **Debug Agent Create** - Debug agent creation
- **Debug Task Queue** - Debug task queueing
- **Debug TypeScript (ts-node)** - Debug TypeScript source directly
- **Debug Current Test** - Debug current test file
- **Attach to Process** - Attach to running Node process

**How to use:**
1. Set breakpoints in `.ts` files
2. Select configuration from dropdown
3. Press `F5` or click green play button
4. Debugger stops at breakpoints with full variable inspection

### 2. Chrome DevTools

```bash
# Build first
npm run build

# Start with debugger
npm run debug -- <command> <args>

# Example
npm run debug -- agent:list
```

Then open Chrome and navigate to:
```
chrome://inspect
```

Click "inspect" under your Node process.

### 3. Node.js Inspector

```bash
node --inspect-brk dist/cli.js <command> <args>
```

Attach any debugger that supports Chrome DevTools Protocol.

### 4. Console Logging

Add debug logs in code:
```typescript
console.log('Debug:', variable);
console.dir(object, { depth: null });
```

## Development Workflows

### Auto-Reload Development

```bash
# Watches src/ and auto-reloads on changes
npm run dev -- <command> <args>

# Example
npm run dev -- agent:create test claude code
```

Uses `nodemon.json` configuration:
- Watches: `src/**/*.ts`, `src/**/*.tsx`
- Ignores: `*.test.ts`, `node_modules`
- Delay: 500ms

### Watch Build

```bash
# Terminal 1: Watch build
npm run build:watch

# Terminal 2: Run CLI
node dist/cli.js <command>
```

### TypeScript Source Debugging

Debug TypeScript directly without building:
```bash
npm run dev:direct -- <command> <args>
```

Or use "Debug TypeScript (ts-node)" configuration in VS Code.

## Testing & Debugging

### Run Tests
```bash
npm test
```

### Watch Tests
```bash
npm run test:watch
```

### Debug Single Test
1. Open test file in VS Code
2. Set breakpoint
3. Select "Debug Current Test" configuration
4. Press `F5`

### Coverage Report
```bash
npm run test:coverage
```

## Common Debugging Scenarios

### Debugging Agent Creation

**VS Code:**
1. Select "Debug Agent Create" configuration
2. Set breakpoint in `src/commands/agent/create.ts`
3. Press `F5`

**CLI:**
```bash
npm run debug -- agent:create test-agent claude code-generation
```

### Debugging TUI

**VS Code:**
1. Select "Debug TUI" configuration
2. Set breakpoint in `src/tui/app.tsx`
3. Press `F5`

**Note:** TUI debugging requires terminal interaction.

### Debugging Task Queue

**VS Code:**
1. Select "Debug Task Queue" configuration
2. Set breakpoint in `src/core/task-queue-manager.ts`
3. Press `F5`

### Debugging Tmux Integration

```bash
# Start with debug
npm run debug -- agent:start test-agent

# Check tmux sessions
tmux ls

# Attach to session
tmux attach -t mindmux-<agent-id>
```

Set breakpoints in:
- `src/core/tmux-controller.ts`
- `src/core/agent-lifecycle.ts`

### Debugging CLI Adapters

Set breakpoints in:
- `src/adapters/base-cli-adapter.ts`
- `src/adapters/claude-cli-adapter.ts`
- `src/utils/output-monitor.ts`

## Source Maps

Source maps are enabled in `tsconfig.json`:
```json
{
  "sourceMap": true,
  "declarationMap": true
}
```

This allows debugging TypeScript source in debugger while running JavaScript.

## Environment Setup

### Node Version (Volta)

Project uses Node 24 via Volta:
```bash
# Install Volta (if not installed)
curl https://get.volta.sh | bash

# Volta will auto-use Node 24 in this project
cd /path/to/mindmux
node --version  # Should show v24.x.x
```

### VS Code Extensions (Recommended)

- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript Vue Plugin** - TypeScript support
- **Error Lens** - Inline error display

## Troubleshooting

### Breakpoints Not Hitting

1. **Check source maps**: Ensure `npm run build` completed successfully
2. **Verify paths**: Check `outFiles` in `.vscode/launch.json`
3. **Clean build**: `rm -rf dist && npm run build`

### "Cannot find module" Errors

```bash
# Rebuild
npm run build

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Volta Not Using Node 24

```bash
# Check Volta installation
volta --version

# Manually pin version
volta pin node@24.2.0
```

### TypeScript Errors in VS Code

```bash
# Reload VS Code window
Cmd+Shift+P > "Reload Window"

# Check TypeScript version
npm run typecheck
```

## Pro Tips

1. **Use breakpoints** instead of `console.log` for complex debugging
2. **Watch expressions** in VS Code debugger for monitoring variables
3. **Call stack** inspection shows exactly how you got to a breakpoint
4. **Conditional breakpoints** for debugging loops (right-click breakpoint)
5. **Logpoints** for non-breaking logging (right-click breakpoint > Add Logpoint)

## CI/CD Debugging

### GitHub Actions Logs

Check `.github/workflows/` for CI configuration.

### Local CI Simulation

```bash
# Run same checks as CI
npm run typecheck
npm run test
npm run build
```

## Performance Profiling

### CPU Profiling

```bash
node --prof dist/cli.js <command>
node --prof-process isolate-*.log > profile.txt
```

### Memory Profiling

```bash
node --inspect dist/cli.js <command>
# Open chrome://inspect
# Take heap snapshot in Memory tab
```

## Additional Resources

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [VS Code Node Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
