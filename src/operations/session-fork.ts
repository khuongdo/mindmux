/**
 * Session forking - clone AI sessions with conversation history
 */

import { TmuxController } from '../core/tmux-controller.js';
import { parseConversation, formatConversationContext } from './conversation-parser.js';
import { getToolStartCommand, getToolInitTimeout, isToolReady } from './tool-commands.js';
import type { AISession, AITool } from '../types/index.js';

export class SessionForker {
  constructor(private tmux: TmuxController) {}

  /**
   * Fork a session with conversation history
   *
   * Creates new tmux pane, restarts AI tool, injects conversation context
   */
  async fork(session: AISession): Promise<string> {
    console.log(`\nForking session: ${session.label || session.id}...`);

    // Step 1: Capture full conversation history
    console.log('  Capturing conversation history...');
    const history = await this.tmux.captureOutput(session.paneId, 10000); // 10k lines

    // Step 2: Parse conversation
    const turns = parseConversation(history);
    const context = formatConversationContext(turns);

    console.log(`  Found ${turns.length} conversation turns`);

    // Step 3: Create new tmux pane (horizontal split)
    console.log('  Creating new pane...');
    const newPaneId = await this.tmux.splitPane(session.sessionName, true);

    try {
      // Step 4: Start AI tool in new pane
      console.log(`  Starting ${session.toolType}...`);
      const startCommand = getToolStartCommand(session.toolType, session.projectPath);
      await this.tmux.sendKeys(newPaneId, startCommand);

      // Step 5: Wait for tool to initialize
      const timeout = getToolInitTimeout(session.toolType);
      console.log(`  Waiting ${timeout}ms for initialization...`);

      await this.waitForToolReady(newPaneId, session.toolType, timeout);

      // Step 6: Inject conversation context
      console.log('  Replaying conversation context...');
      await this.tmux.sendKeys(newPaneId, context);

      console.log(`✓ Fork complete! New pane: ${newPaneId}`);

      return newPaneId;
    } catch (error) {
      // Cleanup on failure
      console.error(`✗ Fork failed: ${error instanceof Error ? error.message : String(error)}`);
      // Kill the pane we created
      await this.tmux.sendKeys(newPaneId, '\u0003'); // Ctrl+C
      throw error;
    }
  }

  /**
   * Wait for AI tool to be ready for input
   *
   * Polls pane output until ready indicator detected
   */
  private async waitForToolReady(paneId: string, tool: AITool, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const output = await this.tmux.captureOutput(paneId, 20);

      if (isToolReady(tool, output)) {
        return;
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Tool failed to initialize within ${timeoutMs}ms`);
  }
}
