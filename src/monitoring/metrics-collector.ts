/**
 * Metrics collector for MindMux
 * Manages counters, gauges, and histograms in-memory
 */

export interface Metrics {
  // Counters (cumulative)
  agents_created: number;
  agents_deleted: number;
  tasks_queued: number;
  tasks_started: number;
  tasks_completed: number;
  tasks_failed: number;
  tasks_cancelled: number;
  errors_total: number;

  // Gauges (current values)
  agents_active: number;
  agents_busy: number;
  tasks_queued_pending: number;
  tasks_running: number;
  queue_depth: number;
  memory_usage_mb: number;

  // Histograms (aggregated)
  task_latency_ms: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  agent_uptime_hours: {
    avg: number;
    min: number;
    max: number;
  };

  // Timestamps
  uptime_seconds: number;
  last_error_at: string | null;
}

interface HistogramSample {
  value: number;
  timestamp: number;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, HistogramSample[]> = new Map();
  private startTime: number = Date.now();
  private lastErrorTime: number | null = null;

  // Retention: keep samples for 24 hours
  private readonly RETENTION_WINDOW_MS = 24 * 60 * 60 * 1000;

  constructor() {
    this.initializeCounters();
    this.initializeGauges();
  }

  private initializeCounters(): void {
    const counters = [
      'agents_created',
      'agents_deleted',
      'tasks_queued',
      'tasks_started',
      'tasks_completed',
      'tasks_failed',
      'tasks_cancelled',
      'errors_total',
    ];
    counters.forEach((counter) => this.counters.set(counter, 0));
  }

  private initializeGauges(): void {
    const gauges = [
      'agents_active',
      'agents_busy',
      'tasks_queued_pending',
      'tasks_running',
      'queue_depth',
      'memory_usage_mb',
    ];
    gauges.forEach((gauge) => this.gauges.set(gauge, 0));
  }

  private cleanupOldSamples(histogramName: string): void {
    const now = Date.now();
    const samples = this.histograms.get(histogramName) || [];
    const filtered = samples.filter((s) => now - s.timestamp < this.RETENTION_WINDOW_MS);
    if (filtered.length > 0) {
      this.histograms.set(histogramName, filtered);
    } else {
      this.histograms.delete(histogramName);
    }
  }

  incrementCounter(name: string, amount: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + amount);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  recordHistogram(name: string, value: number): void {
    const samples = this.histograms.get(name) || [];
    samples.push({ value, timestamp: Date.now() });
    this.histograms.set(name, samples);
    this.cleanupOldSamples(name);
  }

  recordError(): void {
    this.incrementCounter('errors_total');
    this.lastErrorTime = Date.now();
  }

  private calculatePercentile(samples: HistogramSample[], percentile: number): number {
    if (samples.length === 0) return 0;
    const sorted = [...samples].sort((a, b) => a.value - b.value);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)].value;
  }

  private calculateHistogramStats(samples: HistogramSample[]): { avg: number; p50: number; p95: number; p99: number } {
    if (samples.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    const values = samples.map((s) => s.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return {
      avg,
      p50: Math.round(this.calculatePercentile(samples, 50)),
      p95: Math.round(this.calculatePercentile(samples, 95)),
      p99: Math.round(this.calculatePercentile(samples, 99)),
    };
  }

  private calculateUptimeStats(samples: HistogramSample[]): { avg: number; min: number; max: number } {
    if (samples.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }
    const values = samples.map((s) => s.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.round(Math.min(...values));
    const max = Math.round(Math.max(...values));
    return { avg, min, max };
  }

  getMetrics(): Metrics {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const taskLatencySamples = this.histograms.get('task_latency_ms') || [];
    const agentUptimeSamples = this.histograms.get('agent_uptime_hours') || [];

    const taskLatencyStats = this.calculateHistogramStats(taskLatencySamples);
    const agentUptimeStats = this.calculateUptimeStats(agentUptimeSamples);

    return {
      agents_created: this.counters.get('agents_created') || 0,
      agents_deleted: this.counters.get('agents_deleted') || 0,
      tasks_queued: this.counters.get('tasks_queued') || 0,
      tasks_started: this.counters.get('tasks_started') || 0,
      tasks_completed: this.counters.get('tasks_completed') || 0,
      tasks_failed: this.counters.get('tasks_failed') || 0,
      tasks_cancelled: this.counters.get('tasks_cancelled') || 0,
      errors_total: this.counters.get('errors_total') || 0,
      agents_active: this.gauges.get('agents_active') || 0,
      agents_busy: this.gauges.get('agents_busy') || 0,
      tasks_queued_pending: this.gauges.get('tasks_queued_pending') || 0,
      tasks_running: this.gauges.get('tasks_running') || 0,
      queue_depth: this.gauges.get('queue_depth') || 0,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      task_latency_ms: taskLatencyStats,
      agent_uptime_hours: agentUptimeStats,
      uptime_seconds: uptime,
      last_error_at: this.lastErrorTime ? new Date(this.lastErrorTime).toISOString() : null,
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = Date.now();
    this.lastErrorTime = null;
    this.initializeCounters();
    this.initializeGauges();
  }
}

let instance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!instance) {
    instance = new MetricsCollector();
  }
  return instance;
}

export function resetMetricsCollector(): void {
  instance = null;
}
