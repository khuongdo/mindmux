/**
 * Session Scanner
 * Auto-discover AI CLI sessions in tmux
 */

import { TmuxController } from '../core/tmux-controller.js';
import { detectAITool, isAITool } from './ai-tool-detector.js';
import { detectStatus } from './status-detector.js';
import type { AISession, AITool } from '../types/index.js';

export class SessionScanner {
  constructor(private tmux: TmuxController) {}

  /**
   * Scan all tmux sessions for AI CLI tools
   */
  async scan(): Promise<AISession[]> {
    const sessions: AISession[] = [];
    const tmuxSessions = await this.tmux.listSessions();

    for (const sessionName of tmuxSessions) {
      const panes = await this.tmux.listPanes(sessionName);

      for (const { paneId, windowId } of panes) {
        const processName = await this.tmux.getProcessName(paneId);
        let toolType: AITool | null = null;

        // Direct process name detection
        if (isAITool(processName)) {
          toolType = detectAITool(processName);
        }
        // Fallback: Check output for AI tools running in shells
        else if (this.isShell(processName)) {
          const output = await this.tmux.captureOutput(paneId, 20);
          toolType = this.detectAIToolFromOutput(output);

          // Additional hint: check session name pattern (mindmux-{tool}-*)
          if (!toolType && sessionName.startsWith('mindmux-')) {
            toolType = this.detectAIToolFromSessionName(sessionName);
          }
        }

        // Skip if no AI tool detected
        if (!toolType) {
          continue;
        }

        // Extract session metadata
        const projectPath = await this.tmux.getWorkingDirectory(paneId);
        const output = await this.tmux.captureOutput(paneId, 20);
        const status = detectStatus(output);

        sessions.push({
          id: paneId,
          sessionName,
          paneId,
          windowId,
          toolType,
          processName,
          projectPath,
          status,
          lastUpdated: new Date(),
          activeMCPs: [], // Will be populated in Phase 5
        });
      }
    }

    return sessions;
  }

  /**
   * Check if process is a shell
   */
  private isShell(processName: string): boolean {
    const lower = processName.toLowerCase();
    return lower === 'bash' || lower === 'sh' || lower === 'zsh' || lower === 'fish';
  }

  /**
   * Detect AI tool from pane output content
   */
  private detectAIToolFromOutput(output: string): AITool | null {
    const lower = output.toLowerCase();

    // Check for AI tool signatures in output
    if (lower.includes('claude') || lower.includes('anthropic')) {
      return 'claude';
    }
    if (lower.includes('gemini') || lower.includes('google ai')) {
      return 'gemini';
    }
    if (lower.includes('opencode')) {
      return 'opencode';
    }
    if (lower.includes('cursor')) {
      return 'cursor';
    }
    if (lower.includes('aider')) {
      return 'aider';
    }
    if (lower.includes('codex')) {
      return 'codex';
    }

    return null;
  }

  /**
   * Detect AI tool from session name pattern (mindmux-{tool}-timestamp)
   */
  private detectAIToolFromSessionName(sessionName: string): AITool | null {
    const match = sessionName.match(/^mindmux-([a-z]+)-\d+$/);
    if (match && match[1]) {
      const tool = match[1];
      const detected = detectAITool(tool);
      if (detected) {
        return detected;
      }
    }
    return null;
  }

  /**
   * Scan and update session status
   */
  async updateStatus(session: AISession): Promise<AISession> {
    const output = await this.tmux.captureOutput(session.paneId, 20);
    const status = detectStatus(output);

    return {
      ...session,
      status,
      lastUpdated: new Date(),
    };
  }

  /**
   * Find session by ID
   */
  async findById(sessions: AISession[], id: string): Promise<AISession | null> {
    return sessions.find(s => s.id === id || s.paneId === id) || null;
  }

  /**
   * Filter sessions by tool type
   */
  filterByTool(sessions: AISession[], toolType: string): AISession[] {
    return sessions.filter(s => s.toolType === toolType);
  }

  /**
   * Filter sessions by status
   */
  filterByStatus(sessions: AISession[], status: string): AISession[] {
    return sessions.filter(s => s.status === status);
  }

  /**
   * Search sessions by label or project path
   */
  search(sessions: AISession[], query: string): AISession[] {
    const lower = query.toLowerCase();
    return sessions.filter(
      s =>
        s.label?.toLowerCase().includes(lower) ||
        s.projectPath.toLowerCase().includes(lower) ||
        s.toolType.toLowerCase().includes(lower)
    );
  }
}
