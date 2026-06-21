import { describe, expect, it } from 'vitest';
import { generateMeetingAgenda, parseMeetingNotes, type MeetingInput, type MeetingResult } from './meetingIntelligence.js';
import type { MeetingDecision, MeetingRisk, MeetingAction } from './meetingIntelligence.js';

describe('generateMeetingAgenda', () => {
  it('generates agenda from objectives', () => {
    const input: MeetingInput = {
      project_id: 'proj-meeting',
      meeting_id: 'meet-1',
      title: 'Sprint Review',
      date: '2026-06-21',
      objectives: ['Review velocity', 'Adjust backlog'],
    };
    const result = generateMeetingAgenda(input);
    expect(result.agenda.length).toBeGreaterThanOrEqual(2);
    expect(result.project_id).toBe('proj-meeting');
    expect(result.confidence).toBeGreaterThanOrEqual(40);
  });

  it('falls back to general sync when no inputs', () => {
    const input: MeetingInput = {
      project_id: 'proj-meeting',
      meeting_id: 'meet-2',
      title: 'Ad-hoc sync',
      date: '2026-06-21',
    };
    const result = generateMeetingAgenda(input);
    expect(result.agenda.length).toBeGreaterThanOrEqual(1);
    expect(result.agenda[0].topic).toBe('General project sync');
  });

  it('tracks unavailable sources in source_coverage', () => {
    const input: MeetingInput = {
      project_id: 'proj-meeting',
      meeting_id: 'meet-3',
      title: 'Demo',
      date: '2026-06-21',
      unavailable_sources: ['calendar', 'transcript'],
    };
    const result = generateMeetingAgenda(input);
    expect(result.source_coverage).toContain('unavailable:calendar');
    expect(result.source_coverage).toContain('unavailable:transcript');
  });
});

describe('parseMeetingNotes', () => {
  const notes = `
    Action: update README
    Decision: adopt scrum for next sprint
    Risk: vendor API deprecation in July
    Open question: is budget approved?
  `;

  it('extracts actions, decisions, risks, and open questions', () => {
    const parsed = parseMeetingNotes({ notes });
    expect((parsed.actions as MeetingAction[]).length).toBeGreaterThanOrEqual(1);
    expect((parsed.actions as MeetingAction[]).some(a => a.description.toLowerCase().includes('readme'))).toBe(true);
    expect((parsed.decisions as MeetingDecision[]).length).toBeGreaterThanOrEqual(1);
    expect((parsed.decisions as MeetingDecision[]).some(d => d.description.toLowerCase().includes('scrum'))).toBe(true);
    expect((parsed.risks as MeetingRisk[]).length).toBeGreaterThanOrEqual(1);
    expect((parsed.risks as MeetingRisk[]).some(r => r.description.toLowerCase().includes('vendor'))).toBe(true);
    expect(parsed.open_questions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.open_questions[0].toLowerCase()).toContain('budget');
  });

  it('handles empty notes', () => {
    const parsed = parseMeetingNotes({ notes: '' });
    expect(parsed.actions.length).toBe(0);
    expect(parsed.decisions.length).toBe(0);
    expect(parsed.risks.length).toBe(0);
    expect(parsed.open_questions.length).toBe(0);
  });
});
