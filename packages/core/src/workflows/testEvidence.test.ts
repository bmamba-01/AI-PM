import { describe, expect, it } from 'vitest';
import { parseJsonSummary, parseJUnitXml, generateTestEvidenceReport, type TestResult } from './testEvidence.js';

const sampleResults: TestResult[] = [
  { test_name: 'login works', status: 'passed', duration_ms: 120, suite: 'auth', file: 'auth.test.ts', line: 10 },
  { test_name: 'logout works', status: 'passed', duration_ms: 80, suite: 'auth' },
  { test_name: 'bad password rejected', status: 'failed', duration_ms: 200, error_message: 'Expected 401 but got 200', suite: 'auth', file: 'auth.test.ts', line: 25 },
  { test_name: 'slow query', status: 'skipped', suite: 'db' },
  { test_name: 'crash on null', status: 'error', error_message: 'TypeError: Cannot read property of null', suite: 'core', file: 'core.ts', line: 42 },
];

describe('parseJsonSummary', () => {
  it('parses vitest-style JSON', () => {
    const input = [
      { fullName: 'auth > login', status: 'passed', duration: 0.12 },
      { fullName: 'auth > logout', status: 'fail', duration: 0.08, err: { message: 'bad' } },
    ];
    const results = parseJsonSummary(input);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('passed');
    expect(results[1].status).toBe('failed');
    expect(results[1].error_message).toBe('bad');
  });

  it('handles empty array', () => {
    expect(parseJsonSummary([])).toHaveLength(0);
  });

  it('handles non-array', () => {
    expect(parseJsonSummary(null)).toHaveLength(0);
    expect(parseJsonSummary('string')).toHaveLength(0);
  });

  it('normalizes status variations', () => {
    const input = [
      { name: 'a', status: 'Pass' },
      { name: 'b', status: 'SKIP' },
      { name: 'c', status: 'error' },
    ];
    const results = parseJsonSummary(input);
    expect(results[0].status).toBe('passed');
    expect(results[1].status).toBe('skipped');
    expect(results[2].status).toBe('error');
  });
});

describe('parseJUnitXml', () => {
  it('parses JUnit XML with pass/fail', () => {
    const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="auth" tests="3" failures="1">
    <testcase name="login" classname="auth.test" time="0.12"/>
    <testcase name="logout" classname="auth.test" time="0.08">
      <failure message="Expected 200">stack trace</failure>
    </testcase>
    <testcase name="timeout" classname="auth.test" time="5.0"/>
  </testsuite>
</testsuites>`;
    const results = parseJUnitXml(xml);
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('passed');
    expect(results[0].duration_ms).toBe(120);
    expect(results[1].status).toBe('failed');
    expect(results[1].error_message).toBe('Expected 200');
    expect(results[1].suite).toBe('auth.test');
  });

  it('parses skipped tests', () => {
    const xml = '<testcase name="skip-me" classname="x"><skipped/></testcase>';
    const results = parseJUnitXml(xml);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
  });

  it('handles empty XML', () => {
    expect(parseJUnitXml('')).toHaveLength(0);
  });
});

describe('generateTestEvidenceReport', () => {
  it('generates report with correct counts', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: sampleResults });
    expect(report.total).toBe(5);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.error).toBe(1);
    expect(report.pass_rate).toBe(40); // 2/5
  });

  it('computes duration stats', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: sampleResults });
    expect(report.total_duration_ms).toBe(400); // 120+80+200
    expect(report.avg_duration_ms).toBeGreaterThan(0);
  });

  it('lists failure details', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: sampleResults });
    expect(report.failure_details.length).toBe(2); // failed + error
    expect(report.failure_details[0].error_message).toBeTruthy();
  });

  it('groups by suite', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: sampleResults });
    expect(report.suite_summary.auth).toBeDefined();
    expect(report.suite_summary.auth.total).toBe(3);
    expect(report.suite_summary.auth.passed).toBe(2);
    expect(report.suite_summary.auth.failed).toBe(1);
  });

  it('empty results returns 100% pass rate', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: [] });
    expect(report.pass_rate).toBe(100);
    expect(report.total).toBe(0);
    expect(report.confidence).toBe(80);
  });

  it('confidence decreases with failure rate', () => {
    const allPass = generateTestEvidenceReport({ project_id: 'p', results: [
      { test_name: 'a', status: 'passed' },
      { test_name: 'b', status: 'passed' },
    ]});
    const halfFail = generateTestEvidenceReport({ project_id: 'p', results: [
      { test_name: 'a', status: 'passed' },
      { test_name: 'b', status: 'failed', error_message: 'fail' },
    ]});
    expect(halfFail.confidence).toBeLessThan(allPass.confidence);
  });

  it('includes generated_at as ISO string', () => {
    const report = generateTestEvidenceReport({ project_id: 'proj', results: [] });
    expect(new Date(report.generated_at).toISOString()).toBe(report.generated_at);
  });
});
