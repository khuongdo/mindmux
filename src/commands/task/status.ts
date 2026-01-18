/**
 * task:status command
 * Get detailed status of a specific task
 */

import { Command } from 'commander';

export function createTaskStatusCommand(
  getTaskQueueManager: () => import('../../core/task-queue-manager').TaskQueueManager
): Command {
  return new Command('task:status')
    .description('Get task status')
    .argument('<task-id>', 'Task ID')
    .action((taskId) => {
      const taskQueueManager = getTaskQueueManager();
      const task = taskQueueManager.getTask(taskId);

      if (!task) {
        console.error(`Task ${taskId} not found.`);
        process.exit(1);
      }

      console.log('\nTask Details:');
      console.log('-'.repeat(60));
      console.log(`ID:                  ${task.id}`);
      console.log(`Status:              ${task.status}`);
      console.log(`Priority:            ${task.priority}`);
      console.log(`Required Capabilities: ${task.requiredCapabilities.join(', ') || '*'}`);
      console.log(`Depends On:          ${task.dependsOn?.join(', ') || '-'}`);
      console.log(`Agent ID:            ${task.agentId || '-'}`);
      console.log(`Retry Count:         ${task.retryCount}/${task.maxRetries}`);
      console.log('-'.repeat(60));
      console.log(`Created:             ${task.createdAt}`);
      console.log(`Queued:              ${task.queuedAt || '-'}`);
      console.log(`Assigned:            ${task.assignedAt || '-'}`);
      console.log(`Started:             ${task.startedAt || '-'}`);
      console.log(`Completed:           ${task.completedAt || '-'}`);
      console.log('-'.repeat(60));
      console.log(`Prompt:\n${task.prompt}`);

      if (task.result) {
        console.log('-'.repeat(60));
        console.log(`Result:\n${task.result.substring(0, 500)}${task.result.length > 500 ? '...' : ''}`);
      }

      if (task.error) {
        console.log('-'.repeat(60));
        console.log(`Error: ${task.error}`);
      }
    });
}
