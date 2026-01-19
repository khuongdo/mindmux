/**
 * Health checker for MindMux
 * Checks system and dependency health
 */

import { getMetricsCollector } from './metrics-collector.js';

export interface HealthCheckResult {
  ok: boolean;
  count?: number;
  latency_ms?: number;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  version: string;
  checks: {
    agents: HealthCheckResult;
    database?: HealthCheckResult;
    redis?: HealthCheckResult;
  };
  metrics: {
    agents_active: number;
    agents_busy: number;
    tasks_queued: number;
    tasks_running: number;
  };
}

export class HealthChecker {
  private version: string;
  private startTime: number = Date.now();

  // Dependency check functions (optional)
  private databaseCheck: (() => Promise<HealthCheckResult>) | null = null;
  private redisCheck: (() => Promise<HealthCheckResult>) | null = null;

  constructor(version: string = '0.1.0') {
    this.version = version;
  }

  setDatabaseCheck(check: () => Promise<HealthCheckResult>): void {
    this.databaseCheck = check;
  }

  setRedisCheck(check: () => Promise<HealthCheckResult>): void {
    this.redisCheck = check;
  }

  private getAgentCount(): number {
    const metrics = getMetricsCollector().getMetrics();
    return metrics.agents_active;
  }

  private checkAgents(): HealthCheckResult {
    try {
      const count = this.getAgentCount();
      return { ok: true, count };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async check(): Promise<HealthStatus> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const metrics = getMetricsCollector().getMetrics();
    const agentsCheck = this.checkAgents();

    const checks: HealthStatus['checks'] = {
      agents: agentsCheck,
    };

    // Run optional dependency checks
    if (this.databaseCheck) {
      try {
        checks.database = await this.databaseCheck();
      } catch (error) {
        checks.database = {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    if (this.redisCheck) {
      try {
        checks.redis = await this.redisCheck();
      } catch (error) {
        checks.redis = {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Determine overall status
    const criticalFailed = Object.values(checks).some(
      (check) => check && 'ok' in check && !check.ok && (check === checks.database || check === checks.redis)
    );
    const allChecksPassed = Object.values(checks).every((check) => !check || (check && 'ok' in check && check.ok));

    const status: HealthStatus = {
      status: criticalFailed ? 'unhealthy' : allChecksPassed ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: uptime,
      version: this.version,
      checks,
      metrics: {
        agents_active: metrics.agents_active,
        agents_busy: metrics.agents_busy,
        tasks_queued: metrics.tasks_queued_pending,
        tasks_running: metrics.tasks_running,
      },
    };

    return status;
  }
}

let instance: HealthChecker | null = null;

export function getHealthChecker(): HealthChecker {
  if (!instance) {
    instance = new HealthChecker();
  }
  return instance;
}

export function resetHealthChecker(): void {
  instance = null;
}
