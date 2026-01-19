#!/usr/bin/env node
/**
 * Test script for session forking
 */

import { TmuxController } from './core/tmux-controller.js';
import { SessionScanner } from './discovery/session-scanner.js';
import { SessionForker } from './operations/session-fork.js';

async function main() {
  console.log('=== Session Fork Test ===\n');

  const tmux = new TmuxController();
  const scanner = new SessionScanner(tmux);
  const forker = new SessionForker(tmux);

  // Check tmux availability
  if (!tmux.isAvailable()) {
    console.error('Error: tmux not available');
    process.exit(1);
  }

  // Scan for AI sessions
  console.log('Scanning for AI sessions...');
  const sessions = await scanner.scan();

  if (sessions.length === 0) {
    console.log('No AI sessions found.');
    console.log('\nTo test forking:');
    console.log('1. Start an AI tool in tmux: tmux new-session -s test-fork');
    console.log('2. Run: claude code (or gemini chat)');
    console.log('3. Have a conversation');
    console.log('4. Run this script again');
    process.exit(0);
  }

  // Display sessions
  console.log(`\nFound ${sessions.length} AI session(s):\n`);
  sessions.forEach((s, i) => {
    console.log(`${i + 1}. ${s.toolType} - ${s.projectPath}`);
    console.log(`   Session: ${s.sessionName}, Pane: ${s.paneId}`);
    console.log(`   Status: ${s.status}`);
  });

  // Fork first session
  console.log(`\nForking session 1...`);
  try {
    const newPaneId = await forker.fork(sessions[0]);
    console.log(`\n✅ Fork successful!`);
    console.log(`   Parent pane: ${sessions[0].paneId}`);
    console.log(`   Forked pane: ${newPaneId}`);
    console.log(`\nAttach to session: tmux attach -t ${sessions[0].sessionName}`);
  } catch (error) {
    console.error(`\n❌ Fork failed:`, error);
    process.exit(1);
  }
}

main().catch(console.error);
