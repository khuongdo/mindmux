# Session Creation Feature - Manual Testing Checklist

## Pre-Test Requirements
- [ ] mindmux dashboard running (`npm start`)
- [ ] tmux installed and available
- [ ] Valid project directory available for testing
- [ ] At least one AI tool installed (e.g., Claude Code)

## Scenario 1: Valid Session Creation
**Status:** Not tested yet

1. [ ] Open mindmux dashboard
2. [ ] Press 'n' to open new session wizard
3. [ ] Select tool: 1 (Claude Code)
4. [ ] Enter project path: `/Users/nicosys/repo-personal/mindmux`
5. [ ] Enter optional label: "Test Session 1"
6. [ ] Verify: Success message displays with session name and pane ID
7. [ ] Verify: New session visible in dashboard
8. [ ] Verify: Session can be attached with Enter key

**Expected Results:**
- Success message: "✓ Session created successfully!"
- Session name displayed: `mindmux-claude-[timestamp]`
- Pane ID shown: `%[number]`
- Session appears in dashboard list with correct tool type
- Label displays as `[Test Session 1]` in UI

**Notes:**
_______________________________
_______________________________

---

## Scenario 2: Invalid Path Handling
**Status:** Not tested yet

1. [ ] Open mindmux dashboard
2. [ ] Press 'n' to open new session wizard
3. [ ] Select tool: 2 (Gemini CLI)
4. [ ] Enter invalid path: `/nonexistent/path/that/does/not/exist`
5. [ ] Verify: Error message displayed
6. [ ] Verify: Error message: "✗ Path does not exist: /nonexistent/path/..."
7. [ ] Verify: Return to dashboard without session creation
8. [ ] Verify: No session created in tmux

**Expected Results:**
- Error message displays immediately
- Path validation error message is clear
- Return to dashboard preserved
- No orphaned tmux sessions created
- Dashboard refreshes normally

**Notes:**
_______________________________
_______________________________

---

## Scenario 3: Tool Selection Cancellation
**Status:** Not tested yet

1. [ ] Open mindmux dashboard
2. [ ] Press 'n' to open new session wizard
3. [ ] When prompted for tool selection, enter: 0
4. [ ] Verify: Prompt disappears without further input
5. [ ] Verify: Return to dashboard immediately
6. [ ] Verify: No sessions created

**Expected Results:**
- Tool prompt exits cleanly
- No path or label prompts shown
- Dashboard restored immediately
- Session list unchanged

**Notes:**
_______________________________
_______________________________

---

## Scenario 4: Label Sanitization
**Status:** Not tested yet

### Part A: ANSI Code Stripping
1. [ ] Open mindmux dashboard
2. [ ] Press 'n' to open new session wizard
3. [ ] Select tool: 3 (OpenCode)
4. [ ] Enter valid path: `/Users/nicosys/repo-personal/mindmux`
5. [ ] Enter label with ANSI codes: `\x1B[31mRed Text\x1B[0m`
6. [ ] Verify: Session created successfully
7. [ ] Verify: Label in dashboard displays plain text (no ANSI formatting)
8. [ ] Check dashboard display: label shows as plain text

**Expected Results:**
- Session created despite ANSI codes
- Label sanitized of all ANSI escape sequences
- Dashboard display shows plain text label
- No terminal color codes rendered

### Part B: Length Truncation
1. [ ] Open mindmux dashboard
2. [ ] Press 'n' to open new session wizard
3. [ ] Select tool: 4 (Cursor)
4. [ ] Enter valid path: `/Users/nicosys/repo-personal/mindmux`
5. [ ] Enter very long label (100+ characters): `ThisIsAnExtremelyLongLabelThatShouldBeTruncatedToMaximum64CharactersToPreventDisplayIssuesInTheDashboard`
6. [ ] Verify: Session created successfully
7. [ ] Verify: Label truncated to max 64 characters
8. [ ] Check dashboard: Label displays truncated

**Expected Results:**
- Session created successfully
- Label truncated to exactly 64 characters
- Dashboard displays truncated label without issues
- No text overflow in dashboard display

**Notes:**
_______________________________
_______________________________

---

## Scenario 5: Footer Display & Help
**Status:** Not tested yet

1. [ ] Open mindmux dashboard (no arguments)
2. [ ] Check footer text at bottom of screen
3. [ ] Verify: Footer shows "n: New | j/k: Navigate | Enter: Attach | l: Label | f: Fork | m: MCP"
4. [ ] Verify: Footer also shows "/: Search | h/?: Help | q: Quit"
5. [ ] Press 'h' to open help screen
6. [ ] Verify: Help mentions "n" key for new session
7. [ ] Press any key to return from help
8. [ ] Verify: Footer still shows new session shortcut

**Expected Results:**
- Footer displays all shortcuts including "n: New"
- Help screen accessible with 'h' or '?'
- Help documentation includes new session feature
- Footer visible after returning from help
- All shortcuts functional

**Notes:**
_______________________________
_______________________________

---

## Scenario 6: Tool-Specific Timeouts (Optional Extended Testing)
**Status:** Not tested yet

Test initialization timeout for different tools:

1. [ ] Tool: Claude Code (5000ms timeout)
   - Session creation time: ________ms
   - Initialized successfully: [ ] Yes [ ] No

2. [ ] Tool: Gemini (3000ms timeout)
   - Session creation time: ________ms
   - Initialized successfully: [ ] Yes [ ] No

3. [ ] Tool: Aider (3000ms timeout)
   - Session creation time: ________ms
   - Initialized successfully: [ ] Yes [ ] No

**Expected Results:**
- Each tool initializes within specified timeout
- Appropriate success/error message for each tool
- No timeout errors for properly installed tools

---

## Overall Test Results Summary

**Total Scenarios Tested:** _____ / 5 (mandatory)

**Passed:** _____
**Failed:** _____
**Blocked:** _____

### Pass Rate: _____ %

### Critical Issues Found:
1. _______________________________
2. _______________________________
3. _______________________________

### Minor Issues Found:
1. _______________________________
2. _______________________________

### Observations:
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

## Test Approval

**Tested By:** _______________________
**Date:** _______________________
**Environment:** macOS / Linux / Other: __________
**tmux Version:** _______________________
**Node.js Version:** _______________________

**Recommendation:**
[ ] Ready to merge - All scenarios passed
[ ] Ready to merge - Minor issues documented
[ ] Not ready - Blocking issues found (list above)
[ ] Needs additional testing on __________

**Sign-off:** _______________________

---

## Notes for Developers

If any test fails, document:
1. Exact steps to reproduce
2. Expected vs actual output
3. Error messages (if any)
4. System configuration
5. Suggested fix (if known)
