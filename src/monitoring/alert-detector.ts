/**
 * Alert detector for MindMux
 * Detects anomalies and critical issues
 */

import { getMetricsCollector } from './metrics-collector.js';
import { getEventEmitter } from './event-emitter.js';

export interface Alert {
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface ErrorWindow {
  timestamp: number;
  count: number;
}

export class AlertDetector {
  private errorWindows: ErrorWindow[] = [];
  private readonly WINDOW_SIZE_MS = 5 * 60 * 1000; // 5 minutes
  private readonly ERROR_RATE_THRESHOLD = 0.1; // 10%
  private readonly CRITICAL_ERROR_THRESHOLD = 5; // 5 errors in window

  private previousErrorCount = 0;
  private previousTaskCount = 0;

  check(): Alert[] {
    const alerts: Alert[] = [];
    const metrics = getMetricsCollector().getMetrics();
    const now = Date.now();

    // Cleanup old error windows
    this.errorWindows = this.errorWindows.filter((w) => now - w.timestamp < this.WINDOW_SIZE_MS);

    // Detect high error rates
    const newErrors = metrics.errors_total - this.previousErrorCount;
    if (newErrors > 0) {
      this.errorWindows.push({ timestamp: now, count: newErrors });
    }

    const totalErrorsInWindow = this.errorWindows.reduce((sum, w) => sum + w.count, 0);
    const totalTasksProcessed = metrics.tasks_completed + metrics.tasks_failed;
    const totalTasksInWindow = totalTasksProcessed - this.previousTaskCount;

    if (totalTasksInWindow > 0) {
      const errorRate = totalErrorsInWindow / totalTasksInWindow;
      if (errorRate > this.ERROR_RATE_THRESHOLD) {
        alerts.push({
          level: 'warning',
          message: `High error rate detected: ${(errorRate * 100).toFixed(1)}% of tasks failed in last 5 minutes`,
          timestamp: new Date().toISOString(),
          data: {
            error_rate: errorRate,
            errors_in_window: totalErrorsInWindow,
            tasks_in_window: totalTasksInWindow,
          },
        });
      }
    }

    if (totalErrorsInWindow >= this.CRITICAL_ERROR_THRESHOLD) {
      alerts.push({
        level: 'critical',
        message: `Critical: ${totalErrorsInWindow} errors detected in last 5 minutes`,
        timestamp: new Date().toISOString(),
        data: {
          errors_in_window: totalErrorsInWindow,
          threshold: this.CRITICAL_ERROR_THRESHOLD,
        },
      });
    }

    // Detect stuck tasks
    if (metrics.tasks_running > 0 && metrics.queue_depth > 100) {
      alerts.push({
        level: 'warning',
        message: `Queue depth high: ${metrics.queue_depth} tasks pending while ${metrics.tasks_running} running`,
        timestamp: new Date().toISOString(),
        data: {
          queue_depth: metrics.queue_depth,
          tasks_running: metrics.tasks_running,
        },
      });
    }

    // Detect memory pressure
    if (metrics.memory_usage_mb > 500) {
      alerts.push({
        level: 'warning',
        message: `Memory usage high: ${metrics.memory_usage_mb}MB`,
        timestamp: new Date().toISOString(),
        data: {
          memory_usage_mb: metrics.memory_usage_mb,
        },
      });
    }

    // Update tracking
    this.previousErrorCount = metrics.errors_total;
    this.previousTaskCount = totalTasksProcessed;

    return alerts;
  }

  detectAndEmit(): void {
    const alerts = this.check();
    const emitter = getEventEmitter();

    alerts.forEach((alert) => {
      emitter.emitAlert(alert.level, alert.message, alert.data);
    });
  }
}

let instance: AlertDetector | null = null;

export function getAlertDetector(): AlertDetector {
  if (!instance) {
    instance = new AlertDetector();
  }
  return instance;
}

export function resetAlertDetector(): void {
  instance = null;
}
