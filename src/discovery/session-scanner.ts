/**
 * Session Scanner
 * Auto-discover AI CLI sessions in tmux
 */

import { TmuxController } from '../core/tmux-controller.js';
import { detectAITool, isAITool } from './ai-tool-detector.js';
import { detectStatus } from './status-detector.js';
import type { AISession } from '../types/index.js';

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

        // Skip non-AI processes
        if (!isAITool(processName)) {
          continue;
        }

        // Extract session metadata
        const toolType = detectAITool(processName) || 'unknown';
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
