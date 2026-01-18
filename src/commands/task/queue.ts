/**
 * task:queue command
 * Add task to queue with automatic agent assignment
 */

import { Command } from 'commander';

export function createTaskQueueCommand(
  getTaskQueueManager: () => import('../../core/task-queue-manager').TaskQueueManager
): Command {
  return new Command('task:queue')
    .description('Add task to queue (auto-assigns to capable agent)')
    .argument('<prompt>', 'Task prompt/instruction')
    .option('-p, --priority <number>', 'Priority (0-100)', '50')
    .option('-c, --capabilities <caps>', 'Required capabilities (comma-separated)')
    .option('-d, --depends-on <ids>', 'Dependency task IDs (comma-separated)')
    .option('-t, --timeout <ms>', 'Timeout in milliseconds')
    .option('-r, --max-retries <number>', 'Max retry attempts', '3')
    .action((prompt, options) => {
      const taskQueueManager = getTaskQueueManager();

      const task = taskQueueManager.enqueue({
        prompt,
        priority: parseInt(options.priority, 10),
        requiredCapabilities: options.capabilities?.split(',').map((c: string) => c.trim()) || [],
        dependsOn: options.dependsOn?.split(',').map((id: string) => id.trim()),
        timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
        maxRetries: parseInt(options.maxRetries, 10),
      });

      console.log(`Task queued successfully.`);
      console.log(`  ID:       ${task.id}`);
      console.log(`  Status:   ${task.status}`);
      console.log(`  Priority: ${task.priority}`);

      if (task.requiredCapabilities.length > 0) {
        console.log(`  Capabilities: ${task.requiredCapabilities.join(', ')}`);
      }
    });
}
