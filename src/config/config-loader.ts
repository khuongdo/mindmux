import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import TOML from '@iarna/toml';
import type { Config, MCPServer, SessionLabel } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.mindmux');
const MCP_CONFIG_PATH = join(CONFIG_DIR, 'mcp-servers.toml');
const LABELS_PATH = join(CONFIG_DIR, 'session-labels.json');

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load MCP server configurations
 */
export function loadMCPServers(): Record<string, MCPServer> {
  ensureConfigDir();

  if (!existsSync(MCP_CONFIG_PATH)) {
    // Create default config with better examples
    const defaultConfig = `# MindMux MCP Server Configuration
# Define MCP servers that can be toggled per-session via TUI (press 'M')

# Example: Filesystem MCP (access local files)
[mcp.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
scope = "local"  # local = per-project, global = all sessions
[mcp.filesystem.env]
# Optional environment variables
# DEBUG = "true"

# Example: GitHub MCP (access GitHub API)
# [mcp.github]
# command = "npx"
# args = ["-y", "@modelcontextprotocol/server-github"]
# scope = "global"
# [mcp.github.env]
# GITHUB_TOKEN = "your_token_here"

# Example: Brave Search MCP
# [mcp.brave-search]
# command = "npx"
# args = ["-y", "@modelcontextprotocol/server-brave-search"]
# scope = "global"
# [mcp.brave-search.env]
# BRAVE_API_KEY = "your_api_key_here"

# Example: PostgreSQL MCP
# [mcp.postgres]
# command = "npx"
# args = ["-y", "@modelcontextprotocol/server-postgres"]
# scope = "local"
# [mcp.postgres.env]
# DATABASE_URL = "postgresql://user:pass@localhost:5432/db"

# Add more MCPs as needed...
# See: https://github.com/modelcontextprotocol/servers
`;
    writeFileSync(MCP_CONFIG_PATH, defaultConfig);
    return {};
  }

  const content = readFileSync(MCP_CONFIG_PATH, 'utf-8');
  const parsed = TOML.parse(content) as any;

  return parsed.mcp || {};
}

/**
 * Load session labels
 */
export function loadLabels(): SessionLabel[] {
  ensureConfigDir();

  if (!existsSync(LABELS_PATH)) {
    writeFileSync(LABELS_PATH, JSON.stringify([], null, 2));
    return [];
  }

  const content = readFileSync(LABELS_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save session labels
 */
export function saveLabels(labels: SessionLabel[]): void {
  ensureConfigDir();
  writeFileSync(LABELS_PATH, JSON.stringify(labels, null, 2));
}

/**
 * Load full config
 */
export function loadConfig(): Config {
  return {
    mcpServers: loadMCPServers(),
    labels: loadLabels(),
  };
}
