/**
 * task:list command
 * List all tasks with optional filters
 */

import { Command } from 'commander';

export function createTaskListCommand(
  getTaskQueueManager: () => import('../../core/task-queue-manager').TaskQueueManager
): Command {
  return new Command('task:list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status (pending, queued, running, completed, failed, cancelled)')
    .option('-a, --agent <agent>', 'Filter by agent ID or name')
    .option('--stats', 'Show queue statistics only')
    .action((options) => {
      const taskQueueManager = getTaskQueueManager();

      if (options.stats) {
        const stats = taskQueueManager.getQueueStats();
        console.log('\nQueue Statistics:');
        console.log(`  Pending:   ${stats.pending}`);
        console.log(`  Queued:    ${stats.queued}`);
        console.log(`  Assigned:  ${stats.assigned}`);
        console.log(`  Running:   ${stats.running}`);
        console.log(`  Completed: ${stats.completed}`);
        console.log(`  Failed:    ${stats.failed}`);
        console.log(`  Cancelled: ${stats.cancelled}`);
        console.log(`  Total:     ${Object.values(stats).reduce((a, b) => a + b, 0)}`);
        return;
      }

      const tasks = taskQueueManager.listTasks({
        status: options.status,
        agentId: options.agent,
      });

      if (tasks.length === 0) {
        console.log('No tasks found.');
        return;
      }

      console.log('\nTasks:');
      console.log('-'.repeat(100));
      console.log(
        'ID'.padEnd(38) +
        'Status'.padEnd(12) +
        'Priority'.padEnd(10) +
        'Agent'.padEnd(20) +
        'Created'
      );
      console.log('-'.repeat(100));

      for (const task of tasks) {
        console.log(
          task.id.padEnd(38) +
          task.status.padEnd(12) +
          String(task.priority).padEnd(10) +
          (task.agentId || '-').substring(0, 18).padEnd(20) +
          task.createdAt.substring(0, 19)
        );
      }

      console.log('-'.repeat(100));
      console.log(`Total: ${tasks.length} task(s)`);
    });
}
