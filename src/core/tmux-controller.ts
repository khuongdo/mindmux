/**
 * Tmux session controller
 * Manages tmux sessions for agent isolation
 */

import { execSync } from 'child_process';
import { ensureTmuxAvailable } from '../utils/tmux-check';

export class TmuxController {
  private initialized: boolean = false;

  /**
   * Initialize tmux controller
   */
  async initialize(): Promise<void> {
    ensureTmuxAvailable();
    this.initialized = true;
  }

  /**
   * Create a new tmux session for an agent
   */
  async createSession(agentId: string, agentName: string, agentType: string): Promise<string> {
    this.ensureInitialized();

    const sessionName = `mindmux-${agentId}`;

    // Check if session already exists
    if (await this.hasSession(sessionName)) {
      throw new Error(`Session ${sessionName} already exists`);
    }

    try {
      // Create detached session with bash shell
      execSync(`tmux new-session -d -s "${sessionName}" bash`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      // Set environment variables in the session
      await this.sendCommand(sessionName, `export AGENT_ID="${agentId}"`);
      await this.sendCommand(sessionName, `export AGENT_NAME="${agentName}"`);
      await this.sendCommand(sessionName, `export AGENT_TYPE="${agentType}"`);
      await this.sendCommand(sessionName, `export MINDMUX_CONFIG_DIR="${process.env.HOME}/.mindmux"`);

      return sessionName;
    } catch (error) {
      throw new Error(`Failed to create tmux session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a session exists
   */
  async hasSession(sessionName: string): Promise<boolean> {
    try {
      execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, {
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all MindMux tmux sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      const output = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const sessions = output.trim().split('\n').filter(Boolean);
      return sessions.filter(s => s.startsWith('mindmux-'));
    } catch {
      // No sessions or tmux server not running
      return [];
    }
  }

  /**
   * Send command to a tmux session
   */
  async sendCommand(sessionName: string, command: string): Promise<void> {
    this.ensureInitialized();

    if (!await this.hasSession(sessionName)) {
      throw new Error(`Session ${sessionName} does not exist`);
    }

    try {
      execSync(`tmux send-keys -t "${sessionName}" "${command.replace(/"/g, '\\"')}" Enter`, {
        stdio: 'pipe',
      });
    } catch (error) {
      throw new Error(`Failed to send command to session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Capture output from a tmux session pane
   */
  async captureOutput(sessionName: string, lines: number = 100): Promise<string> {
    this.ensureInitialized();

    if (!await this.hasSession(sessionName)) {
      throw new Error(`Session ${sessionName} does not exist`);
    }

    try {
      const output = execSync(
        `tmux capture-pane -p -t "${sessionName}" -S -${lines}`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );
      return output;
    } catch (error) {
      throw new Error(`Failed to capture output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Kill a tmux session
   */
  async killSession(sessionName: string): Promise<void> {
    this.ensureInitialized();

    if (!await this.hasSession(sessionName)) {
      return; // Session doesn't exist, nothing to kill
    }

    try {
      execSync(`tmux kill-session -t "${sessionName}"`, {
        stdio: 'pipe',
      });
    } catch (error) {
      throw new Error(`Failed to kill session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get session information
   */
  async getSessionInfo(sessionName: string): Promise<{ name: string; created: string } | null> {
    if (!await this.hasSession(sessionName)) {
      return null;
    }

    try {
      const output = execSync(
        `tmux list-sessions -F "#{session_name}|#{session_created}" | grep "^${sessionName}|"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      const [name, created] = output.trim().split('|');
      return { name, created };
    } catch {
      return null;
    }
  }

  /**
   * Ensure controller is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TmuxController not initialized. Call initialize() first.');
    }
  }
}
