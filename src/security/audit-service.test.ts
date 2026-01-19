/**
 * Tests for Audit Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService, getAuditService, resetAuditService } from './audit-service.js';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    resetAuditService();
  });

  describe('log', () => {
    it('should log audit entry', () => {
      const entry = auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe('user-1');
      expect(entry.action).toBe('agent:create');
      expect(entry.resource).toBe('agent-1');
      expect(entry.result).toBe('success');
    });

    it('should log with details and error message', () => {
      const entry = auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'failure', {
        details: { reason: 'not-found' },
        errorMessage: 'Agent not found',
      });

      expect(entry.details).toEqual({ reason: 'not-found' });
      expect(entry.errorMessage).toBe('Agent not found');
    });

    it('should generate unique IDs', () => {
      const entry1 = auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      const entry2 = auditService.log('user-1', 'agent:create', 'agent-2', 'agent', 'success');

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'failure');
      auditService.log('user-2', 'task:queue', 'task-1', 'task', 'success');
    });

    it('should query by user', () => {
      const results = auditService.query({ userId: 'user-1' });
      expect(results.length).toBe(2);
      expect(results.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should query by action', () => {
      const results = auditService.query({ action: 'agent:delete' });
      expect(results.length).toBe(1);
      expect(results[0].action).toBe('agent:delete');
    });

    it('should query by resource', () => {
      const results = auditService.query({ resource: 'agent-1' });
      expect(results.length).toBe(2);
    });

    it('should query by result', () => {
      const results = auditService.query({ result: 'failure' });
      expect(results.length).toBe(1);
      expect(results[0].result).toBe('failure');
    });

    it('should sort by timestamp descending', () => {
      const results = auditService.query({});
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp).toBeGreaterThanOrEqual(results[i + 1].timestamp);
      }
    });

    it('should apply pagination', () => {
      const results = auditService.query({ limit: 2, offset: 0 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getResourceHistory', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:start', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:stop', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'task:queue', 'task-1', 'task', 'success');
    });

    it('should get resource history', () => {
      const history = auditService.getResourceHistory('agent-1');
      expect(history.length).toBe(3);
      expect(history.every(e => e.resource === 'agent-1')).toBe(true);
    });
  });

  describe('getUserHistory', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'success');
      auditService.log('user-2', 'task:queue', 'task-1', 'task', 'success');
    });

    it('should get user history', () => {
      const history = auditService.getUserHistory('user-1');
      expect(history.length).toBe(2);
      expect(history.every(e => e.userId === 'user-1')).toBe(true);
    });
  });

  describe('count', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'failure');
      auditService.log('user-2', 'task:queue', 'task-1', 'task', 'success');
    });

    it('should count entries by filter', () => {
      expect(auditService.count({ userId: 'user-1' })).toBe(2);
      expect(auditService.count({ result: 'success' })).toBe(2);
      expect(auditService.count({ action: 'agent:delete' })).toBe(1);
    });
  });

  describe('exportJSON', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
    });

    it('should export as JSON', () => {
      const json = auditService.exportJSON({});
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('exportCSV', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'failure');
    });

    it('should export as CSV', () => {
      const csv = auditService.exportCSV({});
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id,timestamp');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
      auditService.log('user-1', 'agent:delete', 'agent-1', 'agent', 'success');
      auditService.log('user-2', 'task:queue', 'task-1', 'task', 'failure');
    });

    it('should return statistics', () => {
      const stats = auditService.getStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      auditService.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');
    });

    it('should clear all entries', () => {
      expect(auditService.getAllEntries().length).toBeGreaterThan(0);
      auditService.clear();
      expect(auditService.getAllEntries().length).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const service1 = getAuditService();
      const service2 = getAuditService();
      expect(service1).toBe(service2);
    });

    it('should reset singleton', () => {
      const service1 = getAuditService();
      service1.log('user-1', 'agent:create', 'agent-1', 'agent', 'success');

      resetAuditService();
      const service2 = getAuditService();

      expect(service1).not.toBe(service2);
      expect(service2.getAllEntries().length).toBe(0);
    });
  });
});
