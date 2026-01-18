/**
 * Agent logs command
 * View agent output logs from tmux session
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';
import { AgentManager } from '../../core/agent-manager';
import { TmuxController } from '../../core/tmux-controller';
import { AgentLifecycle } from '../../core/agent-lifecycle';

export const logsAgentCommand = new Command('agent:logs')
  .description('View agent output logs')
  .argument('<name>', 'Agent name')
  .option('-n, --lines <number>', 'Number of lines to show', '100')
  .option('-f, --follow', 'Follow log output (live tail)')
  .action(async (name: string, options: { lines?: string; follow?: boolean }) => {
    try {
      const configManager = new ConfigManager();
      const agentManager = new AgentManager(configManager);
      const tmuxController = new TmuxController();
      const lifecycle = new AgentLifecycle(tmuxController, agentManager);

      // Initialize tmux controller
      await tmuxController.initialize();

      // Get agent by name
      const agent = agentManager.getAgentByName(name);
      if (!agent) {
        console.error(`Error: Agent "${name}" not found`);
        console.log('\nAvailable agents:');
        const agents = agentManager.listAgents();
        if (agents.length === 0) {
          console.log('  No agents created yet. Use "mux agent:create" to create one.');
        } else {
          agents.forEach(a => console.log(`  - ${a.name} (${a.type})`));
        }
        process.exit(1);
      }

      // Check if agent has a session
      if (!agent.sessionName) {
        console.error(`Error: Agent "${agent.name}" has no active session`);
        console.log('\nStart the agent first: mux agent:start ' + agent.name);
        process.exit(1);
      }

      // Parse number of lines
      const lines = parseInt(options.lines || '100', 10);
      if (isNaN(lines) || lines < 1) {
        console.error('Error: --lines must be a positive number');
        process.exit(1);
      }

      if (options.follow) {
        // Follow mode - attach to tmux session in read-only mode
        console.log(`Following logs for "${agent.name}" (press Ctrl+C to exit)...`);
        console.log(`Session: ${agent.sessionName}\n`);

        const { spawn } = require('child_process');
        const tmuxAttach = spawn('tmux', ['attach-session', '-t', agent.sessionName, '-r'], {
          stdio: 'inherit',
        });

        tmuxAttach.on('exit', (code: number) => {
          if (code !== 0) {
            console.error('\nError: Failed to attach to session');
            process.exit(1);
          }
          process.exit(0);
        });
      } else {
        // Static mode - capture and display logs
        console.log(`Logs for "${agent.name}" (last ${lines} lines):`);
        console.log(`Session: ${agent.sessionName}\n`);
        console.log('─'.repeat(80));

        const logs = await lifecycle.getAgentLogs(agent.id, lines);
        console.log(logs);

        console.log('─'.repeat(80));
        console.log(`\nTo follow live: mux agent:logs ${agent.name} --follow`);
        console.log(`To attach: tmux attach -t ${agent.sessionName}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
