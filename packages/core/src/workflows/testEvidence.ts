// Test Evidence Workflow — parse JUnit/JSON test summaries into normalized format

export interface TestResult {
  test_name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms?: number;
  error_message?: string;
  file?: string;
  line?: number;
  suite?: string;
  timestamp?: string;
}

export interface TestEvidenceInput {
  project_id: string;
  results: TestResult[];
  source_file?: string;
  assumptions?: string[];
}

export interface TestEvidenceReport {
  project_id: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  error: number;
  pass_rate: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  failure_details: Array<{
    test_name: string;
    error_message: string;
    file?: string;
    line?: number;
  }>;
  suite_summary: Record<string, { total: number; passed: number; failed: number }>;
  source_file?: string;
  assumptions: string[];
  confidence: number;
  generated_at: string;
}

// ── Parse JSON test summary ──────────────────────────────────────────────────

interface JsonTestEntry {
  fullName?: string;
  name?: string;
  status?: string;
  duration?: number;
  err?: { message?: string };
  suite?: string;
  file?: string;
  line?: number;
}

export function parseJsonSummary(data: unknown): TestResult[] {
  if (!Array.isArray(data)) return [];

  return data.map((entry: unknown) => {
    const e = entry as JsonTestEntry;
    const name = e.fullName ?? e.name ?? 'unknown';
    const rawStatus = (e.status ?? 'unknown').toLowerCase();
    const status: TestResult['status'] =
      rawStatus === 'passed' || rawStatus === 'pass' ? 'passed'
        : rawStatus === 'failed' || rawStatus === 'fail' ? 'failed'
        : rawStatus === 'skipped' || rawStatus === 'skip' ? 'skipped'
        : 'error';

    return {
      test_name: name,
      status,
      duration_ms: typeof e.duration === 'number' ? Math.round(e.duration) : undefined,
      error_message: e.err?.message,
      file: e.file,
      line: e.line,
      suite: e.suite,
    };
  });
}

// ── Parse JUnit XML (simplified) ─────────────────────────────────────────────

export function parseJUnitXml(xml: string): TestResult[] {
  const results: TestResult[] = [];

  // Split by testcase boundaries: match <testcase ...>...</testcase> or <testcase .../>
  // Use a two-pass approach: find all testcase start positions, then extract content between them
  const starts: Array<{ pos: number; end: number }> = [];
  const startRegex = /<testcase\s/g;
  let m: RegExpExecArray | null;
  while ((m = startRegex.exec(xml)) !== null) {
    starts.push({ pos: m.index, end: -1 });
  }

  // Find closing </testcase> for each start
  // First find the > that ends the opening tag, then find </testcase> after that
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const nextStart = i + 1 < starts.length ? starts[i + 1].pos : xml.length;

    // Find the > that closes the opening <testcase ...> tag
    const tagClose = xml.indexOf('>', s.pos);
    if (tagClose < 0) { s.end = nextStart; continue; }

    // Check if self-closing: .../> immediately before >
    if (xml[tagClose - 1] === '/') {
      // Self-closing: <testcase .../>
      s.end = tagClose + 1;
    } else {
      // Find </testcase> after the tag close
      const closeTag = xml.indexOf('</testcase>', tagClose);
      s.end = closeTag >= 0 ? closeTag + '</testcase>'.length : nextStart;
    }
  }

  // Now extract each testcase block
  for (const s of starts) {
    const block = xml.slice(s.pos, s.end);

    // Extract attributes from the opening tag
    const tagEnd = block.indexOf('>');
    const tagContent = block.slice(0, tagEnd + 1);
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(tagContent)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    // Extract body (between > and </testcase>)
    const bodyStart = tagEnd + 1;
    const bodyEnd = block.lastIndexOf('</testcase>');
    const body = bodyEnd > bodyStart ? block.slice(bodyStart, bodyEnd) : '';

    const name = attrs.name ?? 'unknown';
    const suite = attrs.classname ?? attrs.class ?? undefined;

    let status: TestResult['status'] = 'passed';
    let error_message: string | undefined;

    if (body.includes('<error')) {
      status = 'error';
      const em = body.match(/<error[^>]*message="([^"]*)"/);
      if (em) error_message = em[1];
    } else if (body.includes('<failure')) {
      status = 'failed';
      const fm = body.match(/<failure[^>]*message="([^"]*)"/);
      if (fm) error_message = fm[1];
    } else if (body.includes('<skipped')) {
      status = 'skipped';
    }

    results.push({
      test_name: name,
      status,
      duration_ms: attrs.time ? Math.round(parseFloat(attrs.time) * 1000) : undefined,
      error_message,
      suite,
    });
  }

  return results;
}

// ── Generate report ──────────────────────────────────────────────────────────

export function generateTestEvidenceReport(input: TestEvidenceInput): TestEvidenceReport {
  const results = input.results;
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errored = results.filter(r => r.status === 'error').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

  const totalDuration = results.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0);
  const withDuration = results.filter(r => r.duration_ms !== undefined).length;
  const avgDuration = withDuration > 0 ? Math.round(totalDuration / withDuration) : 0;

  const failureDetails = results
    .filter(r => (r.status === 'failed' || r.status === 'error') && r.error_message)
    .map(r => ({
      test_name: r.test_name,
      error_message: r.error_message!,
      file: r.file,
      line: r.line,
    }));

  // Suite summary
  const suiteSummary: Record<string, { total: number; passed: number; failed: number }> = {};
  for (const r of results) {
    const suite = r.suite ?? 'default';
    if (!suiteSummary[suite]) suiteSummary[suite] = { total: 0, passed: 0, failed: 0 };
    suiteSummary[suite].total++;
    if (r.status === 'passed') suiteSummary[suite].passed++;
    if (r.status === 'failed' || r.status === 'error') suiteSummary[suite].failed++;
  }

  // Confidence: 100 for no failures, decrease with failure rate
  const failureRate = total > 0 ? (failed + errored) / total : 0;
  const confidence = total === 0
    ? 80
    : Math.max(20, Math.round(100 - failureRate * 60));

  return {
    project_id: input.project_id,
    total,
    passed,
    failed,
    skipped,
    error: errored,
    pass_rate: passRate,
    total_duration_ms: totalDuration,
    avg_duration_ms: avgDuration,
    failure_details: failureDetails,
    suite_summary: suiteSummary,
    source_file: input.source_file,
    assumptions: input.assumptions ?? [],
    confidence,
    generated_at: new Date().toISOString(),
  };
}
