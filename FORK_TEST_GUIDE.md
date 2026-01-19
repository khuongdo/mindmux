# Session Forking Test Guide

This guide explains how to test the session forking functionality in MindMux v2.

## Prerequisites

- tmux installed and available
- An AI CLI tool (Claude Code, Gemini CLI, OpenCode, etc.)
- MindMux v2 built (`npm run build`)

## Test Scenarios

### Scenario 1: Basic Fork Test

1. **Create a test tmux session:**
   ```bash
   tmux new-session -s fork-test
   ```

2. **Start an AI tool:**
   ```bash
   cd /tmp
   claude code
   # or: gemini chat
   # or: opencode
   ```

3. **Have a conversation:**
   - Send a few prompts to the AI
   - Wait for responses
   - Build up some conversation history (3-5 turns)

4. **Detach from tmux:**
   Press `Ctrl+B` then `D`

5. **List sessions:**
   ```bash
   node dist/cli.js list
   ```

6. **Fork the session:**
   ```bash
   node dist/cli.js fork %0
   # Use the pane ID from the list command
   ```

7. **Verify fork:**
   ```bash
   tmux attach -t fork-test
   ```
   - You should see 2 panes (original + forked)
   - Forked pane should have conversation context injected
   - Both panes should be independent

### Scenario 2: Test with test-fork.js

1. **Start an AI session:**
   ```bash
   tmux new-session -s test-ai
   cd ~/my-project
   claude code
   ```

2. **Have a conversation:**
   - "Implement a hello world function"
   - Wait for response
   - "Now add error handling"
   - Wait for response

3. **Detach and run test:**
   ```bash
   # Press Ctrl+B, D to detach
   npm run test:fork
   ```

4. **Check results:**
   - Script should detect the session
   - Fork should create new pane
   - Conversation history should be replayed

### Scenario 3: Long Conversation Test

1. **Create long conversation:**
   - Have 10+ conversation turns
   - Mix short and long responses
   - Include code blocks

2. **Fork and verify:**
   ```bash
   node dist/cli.js fork %0
   ```

3. **Check truncation:**
   - If history > 4000 chars, should keep last 10 turns
   - Recent context preserved
   - Older context truncated gracefully

### Scenario 4: Multiple Sessions

1. **Create multiple sessions:**
   ```bash
   tmux new-session -s claude-session
   cd ~/project1 && claude code
   # Detach (Ctrl+B, D)

   tmux new-session -s gemini-session
   cd ~/project2 && gemini chat
   # Detach (Ctrl+B, D)
   ```

2. **List and fork:**
   ```bash
   node dist/cli.js list
   node dist/cli.js fork %0  # Fork Claude
   node dist/cli.js fork %2  # Fork Gemini
   ```

3. **Verify isolation:**
   - Each fork creates pane in correct session
   - No cross-contamination of history

## Expected Results

### ✅ Success Criteria

- Fork completes in < 5 seconds
- New pane created in same tmux session
- AI tool restarts with correct project path
- Conversation history captured (100% accuracy)
- Context injected as initial prompt
- Both panes remain functional and independent
- No errors in console output

### ❌ Failure Indicators

- Fork timeout (> 5 seconds)
- New pane not created
- AI tool fails to start
- Conversation history missing or incomplete
- Context not injected properly
- Parent pane affected by fork
- Error messages in output

## Troubleshooting

### Fork Fails with "Tool failed to initialize"

- Increase timeout in `src/operations/tool-commands.ts`
- Check tool start command is correct
- Verify tool is in PATH

### Conversation History Empty

- Check tmux scrollback buffer size:
  ```bash
  tmux show-options -g history-limit
  ```
- Increase if needed:
  ```bash
  tmux set-option -g history-limit 50000
  ```

### Context Not Injected

- Verify tool is ready (check `isToolReady` logic)
- Check for special characters in conversation
- Test with simple conversation first

### Pane Creation Fails

- Check tmux session exists
- Verify tmux version (3.0+)
- Test manual split:
  ```bash
  tmux split-window -h -t fork-test
  ```

## Cleanup

After testing:

```bash
# Kill test sessions
tmux kill-session -t fork-test
tmux kill-session -t test-ai
tmux kill-session -t claude-session
tmux kill-session -t gemini-session
```

## Next Steps

Once forking is validated:
- Integrate into TUI (Phase 3)
- Add fork key binding (`f` key)
- Add visual feedback in dashboard
- Support fork labeling
