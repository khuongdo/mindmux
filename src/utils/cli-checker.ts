/**
 * CLI Tool Checker
 * Verifies CLI tools are installed and returns installation instructions
 */

import { execSync } from 'child_process';
import { AgentType } from '../core/types.js';

export interface CLIToolInfo {
  name: string;
  command: string;
  installed: boolean;
  path?: string;
  installInstructions: string;
}

const CLI_TOOLS: Record<AgentType, Omit<CLIToolInfo, 'installed' | 'path'>> = {
  claude: {
    name: 'Claude Code',
    command: 'claude',
    installInstructions: `Install Claude Code CLI:
  npm install -g @anthropic-ai/claude-code
  # Then authenticate:
  claude login`,
  },
  opencode: {
    name: 'OpenCode',
    command: 'opencode',
    installInstructions: `Install OpenCode CLI:
  npm install -g opencode
  # Then authenticate:
  opencode auth`,
  },
  gemini: {
    name: 'Gemini CLI',
    command: 'gemini',
    installInstructions: `Install Gemini CLI:
  npm install -g @google/gemini-cli
  # Then authenticate:
  gemini auth login`,
  },
  gpt4: {
    name: 'GPT-4 (via OpenCode)',
    command: 'opencode',
    installInstructions: `GPT-4 access via OpenCode CLI:
  npm install -g opencode
  opencode auth --provider openai`,
  },
};

/**
 * Check if a CLI tool is installed
 */
export function checkCLIInstalled(type: AgentType): CLIToolInfo {
  const toolConfig = CLI_TOOLS[type];

  try {
    const path = execSync(`which ${toolConfig.command} 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();

    return {
      ...toolConfig,
      installed: true,
      path,
    };
  } catch {
    return {
      ...toolConfig,
      installed: false,
    };
  }
}

/**
 * Ensure CLI tool is installed, throw with instructions if not
 */
export function ensureCLIInstalled(type: AgentType): void {
  const info = checkCLIInstalled(type);

  if (!info.installed) {
    throw new Error(
      `${info.name} CLI not found.\n\n${info.installInstructions}`
    );
  }
}

/**
 * Get CLI command for agent type
 */
export function getCLICommand(type: AgentType): string {
  return CLI_TOOLS[type].command;
}
