#!/usr/bin/env node

/**
 * MindMux v2 - AI Session Tracker
 * Passive session manager for Claude Code, Gemini CLI, and other AI agents
 */

import { Command } from 'commander';
import { TmuxController } from './core/tmux-controller.js';
import { SessionScanner } from './discovery/session-scanner.js';
import { SessionForker } from './operations/session-fork.js';
import { Dashboard } from './tui/dashboard.js';
import { getStatusSymbol, getStatusColor } from './discovery/status-detector.js';
import { colors } from './tui/utils/colors.js';

const program = new Command();

program
  .name('mindmux')
  .description('AI Session Tracker - Terminal session manager for AI coding agents')
  .version('2.0.0');

// Main TUI command (default)
program
  .command('tui', { isDefault: true })
  .description('Launch interactive dashboard')
  .action(async () => {
    const dashboard = new Dashboard();
    await dashboard.start();
  });

// List sessions
program
  .command('list')
  .description('List all AI sessions')
  .option('-t, --type <tool>', 'Filter by AI tool type (claude, gemini, opencode, cursor, aider, codex)')
  .option('-s, --status <status>', 'Filter by status (running, waiting, idle, error)')
  .action(async (options) => {
    const tmux = new TmuxController();
    const scanner = new SessionScanner(tmux);

    // Scan for sessions
    let sessions = await scanner.scan();

    // Apply filters
    if (options.type) {
      sessions = scanner.filterByTool(sessions, options.type);
    }
    if (options.status) {
      sessions = scanner.filterByStatus(sessions, options.status);
    }

    // Display results
    if (sessions.length === 0) {
      console.log('No AI sessions found');
      console.log('Start an AI CLI tool (claude code, gemini chat, etc.) in tmux first');
      return;
    }

    console.log(`\nFound ${sessions.length} AI session(s):\n`);

    for (const session of sessions) {
      const symbol = getStatusSymbol(session.status);
      const color = getStatusColor(session.status);
      const statusText = colors[color](`${symbol} ${session.status}`);

      console.log(`[${statusText}] ${session.toolType} - ${session.projectPath}`);
      console.log(`  Session: ${session.sessionName} | Pane: ${session.paneId}`);
      if (session.label) {
        console.log(`  Label: ${session.label}`);
      }
      console.log('');
    }
  });

// Attach to session
program
  .command('attach <session-id>')
  .description('Attach to session by pane ID')
  .action(async (sessionId: string) => {
    const tmux = new TmuxController();
    const scanner = new SessionScanner(tmux);
    const sessions = await scanner.scan();

    const session = sessions.find(s => s.paneId === sessionId || s.id === sessionId);
    if (!session) {
      console.error(`Error: Session ${sessionId} not found`);
      console.log('\nRun "mindmux list" to see available sessions');
      process.exit(1);
    }

    await tmux.attach(session.sessionName);
  });

// Fork session
program
  .command('fork <pane-id>')
  .description('Fork session with conversation history')
  .action(async (paneId: string) => {
    const tmux = new TmuxController();
    const scanner = new SessionScanner(tmux);
    const forker = new SessionForker(tmux);

    // Find session
    const sessions = await scanner.scan();
    const session = sessions.find(s => s.paneId === paneId || s.id === paneId);

    if (!session) {
      console.error(`Error: Session ${paneId} not found`);
      console.log('\nRun "mindmux list" to see available sessions');
      process.exit(1);
    }

    try {
      const newPaneId = await forker.fork(session);
      console.log(`\n✓ Fork complete! New pane: ${newPaneId}`);
      console.log(`\nAttach to view: tmux attach -t ${session.sessionName}`);
    } catch (error) {
      console.error('Fork failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Check tmux availability
const tmux = new TmuxController();
if (!tmux.isAvailable()) {
  console.error('Error: tmux is not installed or not in PATH');
  console.error('Install tmux: brew install tmux (macOS) or apt install tmux (Linux)');
  process.exit(1);
}

program.parse();
