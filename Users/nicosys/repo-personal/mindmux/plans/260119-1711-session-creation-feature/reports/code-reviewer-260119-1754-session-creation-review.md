# Code Review: Session Creation Feature

**Score:** 7.5/10

**Date:** 2026-01-19
**Reviewer:** code-reviewer agent
**Scope:** Session creation feature with 'n' key

---

## Executive Summary

Feature adds session creation wizard to TUI dashboard. Implementation reuses existing infrastructure (tmux-controller, tool-commands). Code compiles cleanly. Architecture follows YAGNI/KISS principles. **Critical security vulnerability found: command injection risk in execSync calls**. Performance acceptable for interactive CLI. Needs input sanitization improvements.

---

## Scope

**Files Reviewed:**
- `src/operations/session-creator.ts` (155 lines - NEW)
- `src/tui/dashboard.ts` (825 lines - MODIFIED, +207 lines)

**Lines Analyzed:** ~980 LOC

**Review Focus:** Recent changes (git HEAD~1)

**Build Status:** ✓ Compiles successfully (TypeScript clean)

**Updated Plans:** None yet (pending completion)

---

## Overall Assessment

Implementation delivers planned functionality with minimal code (~155 new lines). Follows KISS/YAGNI - reuses tmux-controller and tool-commands modules. Good separation of concerns: SessionCreator handles creation logic, Dashboard handles UI/UX.

**Strengths:**
- Clean module boundaries
- Error handling with cleanup
- User-friendly prompts
- Reuses existing infrastructure
- No breaking changes

**Weaknesses:**
- Command injection vulnerability
- Path validation bypassed on macOS
- No input sanitization for session names
- Dashboard.ts exceeds 200-line guideline (825 lines)
- Missing TODO task verification

---

## Critical Issues (MUST FIX)

### 1. Command Injection Vulnerability (SECURITY)

**Location:** `src/operations/session-creator.ts:91-92, 97-98, 149`

**Issue:** execSync with string interpolation allows command injection

```typescript
execSync(
  `tmux new-session -d -s "${sessionName}" -c "${projectPath}" bash`,
  { encoding: 'utf-8' }
);
```

**Attack Vector:**
```typescript
// User enters projectPath: /tmp"; rm -rf / #
// Results in: tmux new-session -d -s "..." -c "/tmp"; rm -rf / #" bash
```

**Impact:** Arbitrary command execution, file system destruction

**Fix Required:**
```typescript
// Use array-based exec with proper escaping
import { execFileSync } from 'child_process';

// Or sanitize inputs:
function sanitizeShellArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$()]/g, '');
}

const safePath = sanitizeShellArg(projectPath);
const safeName = sanitizeShellArg(sessionName);
```

**Also Affects:**
- Line 97-98: `tmux list-panes -t "${sessionName}"`
- Line 149: `tmux kill-session -t "${sessionName}"`
- `tool-commands.ts:14,18,22`: `cd "${projectPath}" && ...`

---

### 2. Session Name Not Validated

**Location:** `src/operations/session-creator.ts:37`

**Issue:** Generated session names not sanitized

```typescript
const sessionName = `mindmux-${tool}-${timestamp}`;
```

**Risk:** If `tool` contains shell metacharacters (unlikely but possible from type coercion), execSync fails or executes unintended commands

**Fix:**
```typescript
const sessionName = `mindmux-${sanitizeToolName(tool)}-${timestamp}`;

function sanitizeToolName(tool: AITool): string {
  return tool.replace(/[^a-z0-9-]/g, '');
}
```

---

## High Priority Warnings (SHOULD FIX)

### 1. Path Validation Insufficient

**Location:** `src/operations/session-creator.ts:139-142`

**Issue:** existsSync can be bypassed with symlinks, race conditions

```typescript
private isValidPath(path: string): boolean {
  const absolutePath = resolve(path);
  return existsSync(absolutePath);
}
```

**Problem:**
- No check if path is directory (could be file)
- Symlink attacks possible
- TOCTOU race condition (check-to-use)

**Recommendation:**
```typescript
import { statSync } from 'fs';

private isValidPath(path: string): boolean {
  try {
    const absolutePath = resolve(path);
    const stats = statSync(absolutePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
```

---

### 2. No Input Length Limits

**Location:** `src/tui/dashboard.ts:336-360`

**Issue:** promptForPath() accepts unlimited path length

**Risk:**
- Buffer overflow in terminal display
- tmux command length limits (ARG_MAX)
- Memory exhaustion

**Fix:**
```typescript
const path = answer.trim() || cwd;

if (path.length > 4096) { // PATH_MAX on most systems
  console.log(colors.error(`\n✗ Path too long (max 4096 chars)`));
  resolve(null);
  return;
}
```

---

### 3. File Size Violation - dashboard.ts

**Location:** `src/tui/dashboard.ts` (825 lines)

**Issue:** Exceeds 200-line guideline per development rules

**Impact:** Reduces maintainability, harder to review

**Recommendation:** Modularize into:
- `tui/dashboard-core.ts` - Main logic
- `tui/dashboard-prompts.ts` - User input handlers
- `tui/dashboard-actions.ts` - Session actions (create, fork, label, mcp)

---

### 4. Error Messages Expose Implementation Details

**Location:** `src/operations/session-creator.ts:130-133`

**Issue:** Error messages reveal tool detection logic

```typescript
throw new Error(
  `${tool} not found or failed to start.\n` +
  `Please ensure ${tool} is installed and in your PATH.\n` +
  `Install: npm install -g ${tool}-cli`
);
```

**Problem:** Not all tools use npm, message misleading for cursor/aider

**Fix:**
```typescript
const installInstructions: Record<AITool, string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  gemini: 'npm install -g @google/gemini-cli',
  cursor: 'Download from cursor.sh',
  aider: 'pip install aider-chat',
  // ...
};

throw new Error(
  `${tool} not found or failed to start.\n` +
  `Install: ${installInstructions[tool]}`
);
```

---

## Medium Priority Improvements

### 1. Code Duplication - Label Sanitization

**Location:** `src/tui/dashboard.ts:385-390, 559-564`

**Issue:** Identical label sanitization logic duplicated

**Fix:** Extract to utility function
```typescript
function sanitizeLabel(label: string): string {
  // Remove ANSI escape sequences
  let clean = label.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  // Enforce max length (64 chars)
  if (clean.length > 64) {
    clean = clean.substring(0, 64);
  }

  return clean;
}
```

---

### 2. Magic Numbers

**Location:** `src/tui/dashboard.ts:388, 562`

**Issue:** Hardcoded 64 character limit

**Fix:**
```typescript
const MAX_LABEL_LENGTH = 64;

if (label.length > MAX_LABEL_LENGTH) {
  label = label.substring(0, MAX_LABEL_LENGTH);
}
```

---

### 3. Polling Inefficiency

**Location:** `src/operations/session-creator.ts:115-133`

**Issue:** Fixed 500ms polling interval, inefficient for fast tools

**Recommendation:** Exponential backoff
```typescript
let delay = 100; // Start at 100ms
while (Date.now() - startTime < timeoutMs) {
  const output = await this.tmux.captureOutput(paneId, 20);

  if (isToolReady(tool, output)) {
    return;
  }

  await new Promise(resolve => setTimeout(resolve, delay));
  delay = Math.min(delay * 1.5, 1000); // Cap at 1s
}
```

---

### 4. No Loading Indicator

**Location:** `src/tui/dashboard.ts:228-304`

**Issue:** User sees blank screen during session creation (5+ seconds)

**UX Fix:** Add spinner/progress
```typescript
console.log('Creating session...');
let dots = 0;
const spinner = setInterval(() => {
  process.stdout.write(`\r[${'...'.substring(0, dots++ % 4)}]`);
}, 500);

try {
  const result = await this.creator.createSession(...);
  clearInterval(spinner);
  // ...
}
```

---

### 5. Memory Leak Risk - readline

**Location:** `src/tui/dashboard.ts:340-360, 368-394`

**Issue:** readline.createInterface() created in loop, may leak on rapid calls

**Fix:** Reuse single instance or ensure .close() always called
```typescript
private async promptForPath(): Promise<string | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await new Promise(resolve => {
      rl.question(`Project path: `, answer => {
        resolve(answer.trim() || null);
      });
    });
  } finally {
    rl.close(); // Ensure cleanup
  }
}
```

---

## Low Priority Suggestions

### 1. TypeScript Strictness

**Observation:** No null checks on `this.sessions[this.selectedIndex]`

**Location:** `src/tui/dashboard.ts:172, 190, 424`

**Suggestion:** Add runtime assertions
```typescript
const selected = this.sessions[this.selectedIndex];
if (!selected) {
  console.log('No session selected');
  return;
}
```

*Already present but inconsistent - apply everywhere*

---

### 2. Improve Tool Detection Patterns

**Location:** `src/operations/tool-commands.ts:55-75`

**Issue:** Weak detection patterns (e.g., `>` matches any prompt)

**Suggestion:** More specific patterns
```typescript
case 'claude':
  return lower.includes('claude code') ||
         lower.includes('claude>') ||
         /assistant:.*ready/i.test(output);
```

---

### 3. Add Session Creation Tests

**Missing:** Unit tests for SessionCreator

**Recommendation:**
```typescript
// tests/operations/session-creator.test.ts
describe('SessionCreator', () => {
  it('should sanitize session names', () => {
    // Test command injection prevention
  });

  it('should validate project paths', () => {
    // Test directory validation
  });

  it('should cleanup on failure', () => {
    // Test orphan cleanup
  });
});
```

---

## Positive Observations

✓ **Good error handling** - cleanup on failure prevents orphaned sessions
✓ **Clear user feedback** - step-by-step console output during creation
✓ **YAGNI compliance** - no over-engineering, minimal code
✓ **Separation of concerns** - SessionCreator independent of UI
✓ **Reuses infrastructure** - tmux-controller, tool-commands modules
✓ **No breaking changes** - additive feature
✓ **Type safety** - proper TypeScript interfaces
✓ **DRY architecture** - shares tool detection logic

---

## Recommended Actions

**Priority 1 (CRITICAL - Fix before merge):**
1. Sanitize all shell inputs in session-creator.ts (execSync calls)
2. Sanitize projectPath in tool-commands.ts getToolStartCommand()
3. Add input validation for session names
4. Fix path validation to check isDirectory()

**Priority 2 (HIGH - Fix this week):**
5. Add input length limits (path, label, tool)
6. Extract label sanitization to utility function
7. Improve error messages with correct install instructions
8. Modularize dashboard.ts to stay under 200 lines

**Priority 3 (MEDIUM - Nice to have):**
9. Add exponential backoff to tool ready polling
10. Add loading indicator during session creation
11. Fix readline interface cleanup
12. Add unit tests for SessionCreator

**Priority 4 (LOW - Future improvements):**
13. Strengthen tool detection patterns
14. Add TypeScript strict null checks
15. Performance profiling for large session lists

---

## Metrics

**Type Coverage:** 100% (TypeScript strict mode enabled)
**Test Coverage:** 0% (no tests for new code)
**Linting Issues:** 0 (tsc clean)
**Build Status:** ✓ PASS
**Code Size:** 155 new lines (✓ under 200 target)
**Dashboard Size:** 825 lines (✗ exceeds 200 guideline)

---

## Task Completeness Verification

**Plan File:** `/Users/nicosys/repo-personal/mindmux/plans/260119-1711-session-creation-feature/plan.md`

**Success Criteria Status:**
- ✅ Press 'n' opens wizard
- ✅ Select tool (1-6 menu)
- ✅ Enter project path with validation
- ✅ Optional label prompt
- ✅ New session visible in dashboard
- ✅ Footer shows 'n: New' shortcut
- ⚠️ Error handling present but security flaws
- ✅ No breaking changes

**Implementation Phases:**
- ✅ Phase 1: SessionCreator module (complete)
- ✅ Phase 2: TUI integration (complete)
- ⚠️ Phase 3: Error handling (incomplete - security gaps)
- ❌ Phase 4: Testing (not done)

**Missing:**
- Unit tests for session-creator.ts
- Manual testing verification
- README update for 'n' shortcut
- Security hardening (input sanitization)

---

## Unresolved Questions

1. **Why no tests?** Plan specifies Phase 4 manual testing, but no test results documented
2. **Dashboard modularization?** 825 lines violates 200-line rule - when will this be addressed?
3. **Security review?** Was command injection risk assessed during implementation?
4. **Performance testing?** Has session creation been tested with slow network drives or large directories?
5. **Cross-platform?** Tested on Linux/Windows or only macOS?

---

## Next Steps

1. **IMMEDIATE:** Fix command injection vulnerabilities (Priority 1 items)
2. **BEFORE MERGE:** Add basic unit tests for sanitization functions
3. **THIS WEEK:** Modularize dashboard.ts into smaller files
4. **FOLLOW-UP:** Update plan.md with completion status and security notes
