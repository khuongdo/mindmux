/**
 * Dependency Resolver
 * Checks if task dependencies are satisfied
 */

import { Task, TaskStatus } from './types';

export class DependencyResolver {
  /**
   * Check if all dependencies are completed
   * Returns true if task can be executed
   */
  canExecute(task: Task, allTasks: Map<string, Task>): boolean {
    // No dependencies - can execute
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return true;
    }

    // Check all dependencies
    for (const depId of task.dependsOn) {
      const depTask = allTasks.get(depId);

      // Dependency not found - treat as satisfied (task may have been deleted)
      if (!depTask) continue;

      // Dependency must be completed
      if (depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if task should be marked as failed due to dependency failure
   */
  hasDependencyFailed(task: Task, allTasks: Map<string, Task>): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return false;
    }

    for (const depId of task.dependsOn) {
      const depTask = allTasks.get(depId);
      if (depTask && (depTask.status === 'failed' || depTask.status === 'cancelled')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get blocking dependencies (dependencies not yet completed)
   */
  getBlockingDependencies(task: Task, allTasks: Map<string, Task>): string[] {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return [];
    }

    return task.dependsOn.filter(depId => {
      const depTask = allTasks.get(depId);
      return depTask && depTask.status !== 'completed';
    });
  }
}
