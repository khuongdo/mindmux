/**
 * Session Creator
 * Creates new tmux sessions with AI tools
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { TmuxController } from '../core/tmux-controller.js';
import { getToolStartCommand, getToolInitTimeout, isToolReady } from './tool-commands.js';
import type { AITool } from '../types/index.js';

/**
 * Sanitize shell arguments to prevent command injection
 */
function sanitizeShellArg(arg: string): string {
  // Remove shell metacharacters
  return arg.replace(/[;&|`$()<>'"\\]/g, '');
}

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

export class SessionCreator {
  constructor(private tmux: TmuxController) {}

  /**
   * Create new tmux session with AI tool
   */
  async createSession(options: CreateSessionOptions): Promise<CreateSessionResult> {
    const { tool, projectPath, label } = options;

    // Generate unique session name (sanitize tool name)
    const timestamp = Date.now();
    const safeTool = tool.replace(/[^a-z0-9-]/g, '');
    const sessionName = `mindmux-${safeTool}-${timestamp}`;

    console.log(`\nCreating session: ${sessionName}...`);

    try {
      // Step 1: Validate project path exists
      console.log(`  Validating path: ${projectPath}...`);
      if (!this.isValidPath(projectPath)) {
        throw new Error(`Path not found: ${projectPath}\nPlease check the path exists and try again.`);
      }

      // Step 2: Create new tmux session
      console.log('  Creating tmux session...');
      const paneId = await this.createTmuxSession(sessionName, projectPath);

      // Step 3: Start AI tool
      console.log(`  Starting ${tool}...`);
      const startCommand = getToolStartCommand(tool, projectPath);
      await this.tmux.sendKeys(paneId, startCommand);

      // Step 4: Wait for tool to initialize
      console.log('  Waiting for initialization...');
      const timeout = getToolInitTimeout(tool);
      await this.waitForToolReady(paneId, tool, timeout);

      console.log(`✓ Session created: ${sessionName}`);

      return {
        sessionName,
        paneId,
        success: true,
      };
    } catch (error) {
      // Cleanup: kill session if it was created
      await this.cleanup(sessionName);

      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to create session: ${errorMsg}`);

      return {
        sessionName,
        paneId: '',
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Create new tmux session and return pane ID
   */
  private async createTmuxSession(sessionName: string, projectPath: string): Promise<string> {
    try {
      // Sanitize inputs to prevent command injection
      const safeName = sanitizeShellArg(sessionName);
      const safePath = sanitizeShellArg(projectPath);

      // Enforce max lengths
      if (safeName.length > 200 || safePath.length > 500) {
        throw new Error('Session name or path too long');
      }

      // Create detached session with bash in project directory
      execSync(
        `tmux new-session -d -s "${safeName}" -c "${safePath}" bash`,
        { encoding: 'utf-8' }
      );

      // Get pane ID of new session
      const paneId = execSync(
        `tmux list-panes -t "${safeName}" -F "#{pane_id}"`,
        { encoding: 'utf-8' }
      ).trim();

      return paneId;
    } catch (error) {
      throw new Error(
        `Failed to create tmux session.\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n` +
        `Ensure tmux is installed: brew install tmux`
      );
    }
  }

  /**
   * Wait for AI tool to be ready
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

    throw new Error(
      `${tool} not found or failed to start.\n` +
      `Please ensure ${tool} is installed and in your PATH.\n` +
      `Install: npm install -g ${tool}-cli`
    );
  }

  /**
   * Validate project path exists and is a directory
   */
  private isValidPath(path: string): boolean {
    try {
      const absolutePath = resolve(path);
      const stats = statSync(absolutePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Cleanup failed session creation
   */
  private async cleanup(sessionName: string): Promise<void> {
    try {
      const safeName = sanitizeShellArg(sessionName);
      execSync(`tmux kill-session -t "${safeName}" 2>/dev/null || true`);
    } catch {
      // Ignore cleanup errors
    }
  }
}
