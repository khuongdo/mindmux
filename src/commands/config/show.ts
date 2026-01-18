/**
 * Config show command - for testing hierarchy
 */

import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager';

export const showConfigCommand = new Command('config:show')
  .description('Show current configuration (merged from all sources)')
  .action(() => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      console.log('');
      console.log('CURRENT CONFIGURATION');
      console.log('═'.repeat(60));
      console.log(JSON.stringify(config, null, 2));
      console.log('═'.repeat(60));
      console.log('');
      console.log('Config hierarchy: project-local > global > defaults');

      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${error}`);
      }
      process.exit(1);
    }
  });
