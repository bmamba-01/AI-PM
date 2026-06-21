import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const connectorsDir = new URL('../../../../schemas/fixtures/connectors/', import.meta.url);

function loadFixture(name: string) {
  return JSON.parse(readFileSync(new URL(name, connectorsDir), 'utf-8'));
}

describe('connector fixtures', () => {
  it('github issues validate as issue summary', () => {
    const fixture = loadFixture('github-issues.json');
    expect(Array.isArray(fixture.issues)).toBe(true);
    expect(fixture.issues[0].id).toBe('GH-1');
    expect(fixture.issues[0].status).toBe('open');
  });

  it('jira issues validate as issue summary', () => {
    const fixture = loadFixture('jira-issues.json');
    expect(Array.isArray(fixture.issues)).toBe(true);
    expect(fixture.issues[0].id).toBe('JRA-1');
  });

  it('linear issues validate as issue summary', () => {
    const fixture = loadFixture('linear-issues.json');
    expect(Array.isArray(fixture.issues)).toBe(true);
    expect(fixture.issues[0].id).toBe('LIN-1');
  });

  it('notion pages validate as doc summary', () => {
    const fixture = loadFixture('notion-pages.json');
    expect(Array.isArray(fixture.pages)).toBe(true);
    expect(fixture.pages[0].id).toBe('NT-1');
  });
});
