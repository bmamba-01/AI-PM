import { describe, it, expect } from 'vitest';
import {
  VALID_TRACKING_SYSTEMS,
  VALID_TRACKING_MODES,
  VALID_TASK_STATUSES,
  type TrackingSystem,
  type TrackingMode,
  type TaskStatus,
  type TrackingConfig,
  type CreateTaskInput,
  type TrackingUpdate,
} from './types.js';

describe('tracking types', () => {
  describe('VALID_TRACKING_SYSTEMS', () => {
    it('contains expected systems', () => {
      expect(VALID_TRACKING_SYSTEMS).toContain('notion');
      expect(VALID_TRACKING_SYSTEMS).toContain('jira');
      expect(VALID_TRACKING_SYSTEMS).toContain('linear');
      expect(VALID_TRACKING_SYSTEMS).toContain('github');
      expect(VALID_TRACKING_SYSTEMS).toContain('excel');
      expect(VALID_TRACKING_SYSTEMS).toContain('local_memory');
      expect(VALID_TRACKING_SYSTEMS).toHaveLength(6);
    });

    it('invalid system is not in the list', () => {
      expect(VALID_TRACKING_SYSTEMS).not.toContain('asana');
      expect(VALID_TRACKING_SYSTEMS).not.toContain('trello');
      expect(VALID_TRACKING_SYSTEMS).not.toContain('monday');
    });
  });

  describe('VALID_TRACKING_MODES', () => {
    it('contains expected modes', () => {
      expect(VALID_TRACKING_MODES).toContain('live');
      expect(VALID_TRACKING_MODES).toContain('dry_run');
      expect(VALID_TRACKING_MODES).toContain('local_import');
      expect(VALID_TRACKING_MODES).toContain('manual');
      expect(VALID_TRACKING_MODES).toHaveLength(4);
    });

    it('invalid mode is not in the list', () => {
      expect(VALID_TRACKING_MODES).not.toContain('batch');
      expect(VALID_TRACKING_MODES).not.toContain('auto');
    });
  });

  describe('VALID_TASK_STATUSES', () => {
    it('contains expected statuses', () => {
      expect(VALID_TASK_STATUSES).toContain('ready');
      expect(VALID_TASK_STATUSES).toContain('in_progress');
      expect(VALID_TASK_STATUSES).toContain('blocked');
      expect(VALID_TASK_STATUSES).toContain('done');
      expect(VALID_TASK_STATUSES).toContain('cancelled');
    });
  });

  describe('type guards', () => {
    it('TrackingSystem type accepts valid values', () => {
      const sys: TrackingSystem = 'notion';
      expect(VALID_TRACKING_SYSTEMS.includes(sys)).toBe(true);
    });

    it('TrackingMode type accepts valid values', () => {
      const mode: TrackingMode = 'dry_run';
      expect(VALID_TRACKING_MODES.includes(mode)).toBe(true);
    });

    it('TaskStatus type accepts valid values', () => {
      const status: TaskStatus = 'in_progress';
      expect(VALID_TASK_STATUSES.includes(status)).toBe(true);
    });
  });
});
