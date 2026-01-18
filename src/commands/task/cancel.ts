/**
 * task:cancel command
 * Cancel a pending or queued task
 */

import { Command } from 'commander';

export function createTaskCancelCommand(
  getTaskQueueManager: () => import('../../core/task-queue-manager').TaskQueueManager
): Command {
  return new Command('task:cancel')
    .description('Cancel a pending or queued task')
    .argument('<task-id>', 'Task ID')
    .action((taskId) => {
      const taskQueueManager = getTaskQueueManager();

      const success = taskQueueManager.cancel(taskId);

      if (success) {
        console.log(`Task ${taskId} cancelled.`);
      } else {
        const task = taskQueueManager.getTask(taskId);
        if (!task) {
          console.error(`Task ${taskId} not found.`);
        } else {
          console.error(`Cannot cancel task in status: ${task.status}`);
        }
        process.exit(1);
      }
    });
}
