import { describe, expect, it } from 'vitest';
import {
  generateCodeQualityReview,
  runCodeQualityReview,
} from './codeQualityGuard.js';

describe('codeQualityGuard', () => {
  it('marks ready when no critical findings and tests provided', () => {
    const input = {
      projectId: 'local-project',
      diffText: 'function add(a, b) { return a + b; }\nconsole.log("ok");',
      requirementsText:
        'function add(a, b) { return a + b; }\nThe function should compute a + b.',
      testEvidence: 'describe("add", () => { it("adds", () => { expect(add(1,2)).toBe(3); }); });',
      knownRisks: ['Low coverage in edge cases.'],
    };

    const result = generateCodeQualityReview(input);

    expect(result.mergeReadiness).toBe('ready');
    expect(result.requirementGaps.length).toBeGreaterThanOrEqual(0);
    expect(result.verificationSeen.length).toBeGreaterThan(0);
  });

  it('marks not_ready when secrets are detected', () => {
    const input = {
      projectId: 'local-project',
      diffText: 'const secret = "password123";\nconst apiKey = process.env.API_KEY;',
      requirementsText: '',
      testEvidence: '',
    };

    const result = generateCodeQualityReview(input);

    expect(result.mergeReadiness).toBe('not_ready');
    expect(result.criticalFindings.some(f => /secret/i.test(f))).toBe(true);
  });

  it('detects missing tests when none provided and logic changed', () => {
    const input = {
      projectId: 'local-project',
      diffText: 'function calculatePayment(order) {\n  return order.total * 1.1;\n}',
      requirementsText: '',
      testEvidence: '',
    };

    const result = generateCodeQualityReview(input);

    expect(result.mergeReadiness).not.toBe('ready');
    expect(result.missingTests.length).toBeGreaterThan(0);
  });
});
