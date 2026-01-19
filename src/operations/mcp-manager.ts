/**
 * MCP Manager
 * Toggle MCP servers for AI sessions
 */

import { TmuxController } from '../core/tmux-controller.js';
import { getToolStartCommand, getToolInitTimeout, isToolReady } from './tool-commands.js';
import { loadMCPServers, loadLabels, saveLabels } from '../config/config-loader.js';
import type { AISession, MCPServer, SessionLabel } from '../types/index.js';

export class MCPManager {
  constructor(private tmux: TmuxController) {}

  /**
   * Get available MCP servers
   */
  getAvailableMCPs(): Record<string, MCPServer> {
    return loadMCPServers();
  }

  /**
   * Get active MCPs for session
   */
  getActiveMCPs(session: AISession): string[] {
    return session.activeMCPs || [];
  }

  /**
   * Toggle MCP for session
   */
  async toggleMCP(session: AISession, mcpName: string): Promise<void> {
    const mcps = this.getAvailableMCPs();
    const mcp = mcps[mcpName];

    if (!mcp) {
      throw new Error(`MCP not found: ${mcpName}`);
    }

    // Check if MCP is currently active
    const isActive = session.activeMCPs.includes(mcpName);

    if (isActive) {
      await this.disableMCP(session, mcpName);
    } else {
      await this.enableMCP(session, mcpName, mcp);
    }
  }

  /**
   * Enable MCP for session (restart with MCP)
   */
  private async enableMCP(session: AISession, mcpName: string, mcp: MCPServer): Promise<void> {
    console.log(`\nEnabling MCP: ${mcpName}...`);

    // Step 1: Gracefully exit current AI tool
    console.log('  Stopping current session...');
    await this.tmux.sendKeys(session.paneId, '\u0003');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Set MCP environment variables
    console.log('  Setting MCP environment...');
    const envVars = this.buildMCPEnv(mcpName, mcp);

    for (const [key, value] of Object.entries(envVars)) {
      const escapedValue = value.replace(/"/g, '\\"');
      await this.tmux.sendKeys(session.paneId, `export ${key}="${escapedValue}"`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Restart AI tool
    console.log(`  Restarting ${session.toolType}...`);
    const startCommand = getToolStartCommand(session.toolType, session.projectPath);
    await this.tmux.sendKeys(session.paneId, startCommand);

    // Step 4: Wait for tool to initialize
    const timeout = getToolInitTimeout(session.toolType);
    await this.waitForToolReady(session.paneId, session.toolType, timeout);

    // Step 5: Update session state
    session.activeMCPs.push(mcpName);
    this.saveSessionState(session);

    console.log(`✓ MCP enabled: ${mcpName}`);
  }

  /**
   * Disable MCP for session (restart without MCP)
   */
  private async disableMCP(session: AISession, mcpName: string): Promise<void> {
    console.log(`\nDisabling MCP: ${mcpName}...`);

    // Step 1: Remove from active MCPs
    session.activeMCPs = session.activeMCPs.filter(m => m !== mcpName);

    // Step 2: Gracefully exit current AI tool
    console.log('  Stopping current session...');
    await this.tmux.sendKeys(session.paneId, '\u0003');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Clear MCP environment (unset vars)
    const mcps = this.getAvailableMCPs();
    const mcp = mcps[mcpName];
    if (mcp) {
      const envVars = this.buildMCPEnv(mcpName, mcp);
      for (const key of Object.keys(envVars)) {
        await this.tmux.sendKeys(session.paneId, `unset ${key}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 4: Restart AI tool (without MCP)
    console.log(`  Restarting ${session.toolType}...`);
    const startCommand = getToolStartCommand(session.toolType, session.projectPath);
    await this.tmux.sendKeys(session.paneId, startCommand);

    // Step 5: Wait for tool to initialize
    const timeout = getToolInitTimeout(session.toolType);
    await this.waitForToolReady(session.paneId, session.toolType, timeout);

    // Step 6: Update session state
    this.saveSessionState(session);

    console.log(`✓ MCP disabled: ${mcpName}`);
  }

  /**
   * Build MCP environment variables
   */
  private buildMCPEnv(mcpName: string, mcp: MCPServer): Record<string, string> {
    const env: Record<string, string> = {};

    // Set MCP server command (join args properly)
    const mcpCommand = [mcp.command, ...mcp.args].join(' ');
    const envKey = `MCP_SERVER_${mcpName.toUpperCase()}`;
    env[envKey] = mcpCommand;

    // Set custom environment variables from config
    if (mcp.env) {
      Object.assign(env, mcp.env);
    }

    return env;
  }

  /**
   * Wait for AI tool to be ready
   */
  private async waitForToolReady(paneId: string, tool: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const output = await this.tmux.captureOutput(paneId, 20);

      if (isToolReady(tool as any, output)) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Tool failed to initialize within ${timeoutMs}ms`);
  }

  /**
   * Save session MCP state (persist across restarts)
   */
  private saveSessionState(session: AISession): void {
    const labels = loadLabels();
    const existingIndex = labels.findIndex(l => l.sessionId === session.id);

    // Store active MCPs in label metadata
    const labelEntry: SessionLabel & { activeMCPs: string[] } = {
      sessionId: session.id,
      label: session.label || '',
      createdAt: existingIndex >= 0 ? labels[existingIndex].createdAt : new Date(),
      activeMCPs: session.activeMCPs,
    };

    if (existingIndex >= 0) {
      (labels as any)[existingIndex] = labelEntry;
    } else {
      (labels as any).push(labelEntry);
    }

    saveLabels(labels);
  }
}
