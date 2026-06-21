import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  listCommands,
  executeQuery,
  fetchCommandCenterData,
  loadQueuedQueries,
  getQueuedQueryCount,
  type QueryResult,
} from './command-center';

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock approval-store
vi.mock('./approval-store', () => ({
  getApprovalBaseUrl: vi.fn().mockReturnValue(null),
  checkServerHealth: vi.fn().mockResolvedValue('unreachable'),
  setApprovalBaseUrl: vi.fn().mockResolvedValue(undefined),
}));

describe('command-center', () => {
  describe('listCommands', () => {
    it('returns mock commands when no server', async () => {
      const cmds = await listCommands();
      expect(cmds.length).toBe(4);
      expect(cmds.map(c => c.id)).toContain('daily_brief');
      expect(cmds.map(c => c.id)).toContain('weekly_status');
      expect(cmds.map(c => c.id)).toContain('risk_summary');
      expect(cmds.map(c => c.id)).toContain('pending_approvals');
      expect(cmds.every(c => c.read_only)).toBe(true);
    });
  });

  describe('executeQuery', () => {
    it('returns mock daily_brief when no server', async () => {
      const { result, fromServer } = await executeQuery('daily_brief');
      expect(fromServer).toBe(false);
      expect(result.command).toBe('daily_brief');
      expect(result).toHaveProperty('project_summary');
      expect(result).toHaveProperty('pending_approvals');
      expect(result).toHaveProperty('today_activity');
    });

    it('returns mock weekly_status when no server', async () => {
      const { result, fromServer } = await executeQuery('weekly_status');
      expect(fromServer).toBe(false);
      expect(result.command).toBe('weekly_status');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('approvals_summary');
      expect(result).toHaveProperty('tasks_summary');
    });

    it('returns mock risk_summary when no server', async () => {
      const { result, fromServer } = await executeQuery('risk_summary');
      expect(fromServer).toBe(false);
      expect(result.command).toBe('risk_summary');
      expect(result).toHaveProperty('risk_signals');
    });

    it('returns mock pending_approvals when no server', async () => {
      const { result, fromServer } = await executeQuery('pending_approvals');
      expect(fromServer).toBe(false);
      expect(result.command).toBe('pending_approvals');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('items');
    });

    it('returns mock result for unknown command', async () => {
      const { result } = await executeQuery('unknown_command');
      expect(result.command).toBe('daily_brief');
    });
  });

  describe('fetchCommandCenterData', () => {
    it('returns all mock data when no server', async () => {
      const data = await fetchCommandCenterData();
      expect(data.dailyBrief).not.toBeNull();
      expect(data.weeklyStatus).not.toBeNull();
      expect(data.riskSummary).not.toBeNull();
      expect(data.pendingApprovals).not.toBeNull();
      expect(data.isLoading).toBe(false);
      expect(data.error).toBeNull();
      expect(data.lastUpdated).toBeDefined();
    });

    it('includes mock pending approvals', async () => {
      const data = await fetchCommandCenterData();
      expect(data.pendingApprovals!.count).toBeGreaterThan(0);
      expect(data.pendingApprovals!.items.length).toBeGreaterThan(0);
    });
  });

  describe('queued queries', () => {
    it('returns 0 queued when no queue exists', async () => {
      const count = await getQueuedQueryCount();
      expect(count).toBe(0);
    });

    it('returns empty array when no queue exists', async () => {
      const queue = await loadQueuedQueries();
      expect(queue).toEqual([]);
    });
  });
});
