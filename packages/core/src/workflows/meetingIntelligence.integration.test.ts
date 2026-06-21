import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateMeetingAgenda, parseMeetingNotes, type MeetingInput } from './meetingIntelligence.js';
import { LocalProjectStore } from '../runtime/localProjectStore.js';
import { ApprovalQueue } from '../runtime/approvalQueue.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-meeting-int-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('MeetingIntelligence — integration', () => {
  it('full run: create temp project → generate agenda → parse notes → verify shapes', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    const approvalQueue = new ApprovalQueue(root);
    await store.ensureProjectDirs();

    const input: MeetingInput = {
      project_id: 'proj-meeting-int',
      meeting_id: 'meet-1',
      title: 'Sprint Review',
      date: '2026-06-21',
      objectives: ['Review velocity', 'Adjust backlog'],
      related_issue_ids: ['ISSUE-1'],
      open_action_ids: ['ACT-1'],
      transcript: 'Action: update README\nDecision: adopt scrum\nRisk: vendor API deprecation',
      unavailable_sources: ['calendar'],
    };

    const agendaResult = generateMeetingAgenda(input);
    expect(agendaResult.project_id).toBe('proj-meeting-int');
    expect(agendaResult.agenda.length).toBeGreaterThanOrEqual(3);
    expect(agendaResult.source_coverage).toContain('unavailable:calendar');

    const parsed = parseMeetingNotes({ transcript: input.transcript });
    expect(parsed.actions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.decisions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.risks.length).toBeGreaterThanOrEqual(1);
  });
});
