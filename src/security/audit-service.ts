/**
 * Audit Service
 * Provides audit logging and querying capabilities
 * Records all sensitive operations for compliance and forensics
 */

export type AuditAction =
  | 'agent:create'
  | 'agent:delete'
  | 'agent:start'
  | 'agent:stop'
  | 'task:queue'
  | 'task:cancel'
  | 'task:complete'
  | 'auth:login'
  | 'auth:logout'
  | 'auth:failed'
  | 'key:rotate'
  | 'key:access'
  | 'config:read'
  | 'config:write'
  | 'permission:denied'
  | 'session:created'
  | 'session:expired'
  | 'session:revoked';

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: AuditAction;
  resource: string; // Agent ID, Task ID, etc.
  resourceType: string; // agent, task, config, session
  result: 'success' | 'failure';
  details?: Record<string, unknown>;
  errorMessage?: string;
  ipAddress?: string;
  sessionToken?: string;
}

export interface AuditFilter {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceType?: string;
  result?: 'success' | 'failure';
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private entries: AuditEntry[] = [];
  private nextId: number = 1;

  /**
   * Log an audit entry
   */
  log(
    userId: string,
    action: AuditAction,
    resource: string,
    resourceType: string,
    result: 'success' | 'failure',
    options?: {
      details?: Record<string, unknown>;
      errorMessage?: string;
      ipAddress?: string;
      sessionToken?: string;
    }
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${this.nextId++}`,
      timestamp: Date.now(),
      userId,
      action,
      resource,
      resourceType,
      result,
      details: options?.details,
      errorMessage: options?.errorMessage,
      ipAddress: options?.ipAddress,
      sessionToken: options?.sessionToken,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Query audit log with filters
   */
  query(filter: AuditFilter): AuditEntry[] {
    let results = this.entries;

    if (filter.userId) {
      results = results.filter(e => e.userId === filter.userId);
    }

    if (filter.action) {
      results = results.filter(e => e.action === filter.action);
    }

    if (filter.resource) {
      results = results.filter(e => e.resource === filter.resource);
    }

    if (filter.resourceType) {
      results = results.filter(e => e.resourceType === filter.resourceType);
    }

    if (filter.result) {
      results = results.filter(e => e.result === filter.result);
    }

    if (filter.startTime) {
      results = results.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(e => e.timestamp <= filter.endTime!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit entries for resource
   */
  getResourceHistory(resource: string): AuditEntry[] {
    return this.query({
      resource,
      limit: 1000,
    });
  }

  /**
   * Get audit entries for user
   */
  getUserHistory(userId: string): AuditEntry[] {
    return this.query({
      userId,
      limit: 1000,
    });
  }

  /**
   * Count entries matching filter
   */
  count(filter: AuditFilter): number {
    return this.query({ ...filter, limit: Number.MAX_SAFE_INTEGER }).length;
  }

  /**
   * Export audit log as JSON
   */
  exportJSON(filter: AuditFilter): string {
    const entries = this.query(filter);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Export audit log as CSV
   */
  exportCSV(filter: AuditFilter): string {
    const entries = this.query(filter);

    const headers = [
      'id',
      'timestamp',
      'userId',
      'action',
      'resource',
      'resourceType',
      'result',
      'details',
      'errorMessage',
    ];

    const rows = entries.map(e => [
      e.id,
      new Date(e.timestamp).toISOString(),
      e.userId,
      e.action,
      e.resource,
      e.resourceType,
      e.result,
      JSON.stringify(e.details || {}),
      e.errorMessage || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEntries: number;
    successCount: number;
    failureCount: number;
    uniqueUsers: number;
    oldestEntry?: AuditEntry;
    newestEntry?: AuditEntry;
  } {
    const successCount = this.entries.filter(e => e.result === 'success').length;
    const failureCount = this.entries.filter(e => e.result === 'failure').length;
    const uniqueUsers = new Set(this.entries.map(e => e.userId)).size;

    const sorted = [...this.entries].sort((a, b) => a.timestamp - b.timestamp);

    return {
      totalEntries: this.entries.length,
      successCount,
      failureCount,
      uniqueUsers,
      oldestEntry: sorted[0],
      newestEntry: sorted[sorted.length - 1],
    };
  }

  /**
   * Clear all entries (use with caution)
   */
  clear(): void {
    this.entries = [];
    this.nextId = 1;
  }

  /**
   * Get all entries
   */
  getAllEntries(): AuditEntry[] {
    return [...this.entries];
  }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

export function resetAuditService(): void {
  auditServiceInstance = null;
}
