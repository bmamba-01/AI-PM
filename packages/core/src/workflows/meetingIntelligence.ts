// Meeting Intelligence Workflow
// Pre-meeting agenda generation and post-meeting MoM/actions/risks extraction.

export interface MeetingInput {
  project_id: string;
  meeting_id: string;
  title: string;
  date: string;
  objectives?: string[];
  related_issue_ids?: string[];
  open_action_ids?: string[];
  transcript?: string;
  notes?: string;
  minutes_template?: string;
  unavailable_sources?: string[];
  assumptions?: string[];
}

export interface MeetingAgendaItem {
  id: string;
  topic: string;
  owner?: string;
  duration_minutes?: number;
  objective?: string;
}

export interface MeetingAction {
  id: string;
  description: string;
  owner?: string;
  due_date?: string;
  source: string;
}

export interface MeetingDecision {
  id: string;
  description: string;
  rationale?: string;
  owner?: string;
}

export interface MeetingRisk {
  id: string;
  description: string;
  severity?: string;
  owner?: string;
}

export interface MeetingResult {
  project_id: string;
  meeting_id: string;
  title: string;
  date: string;
  agenda: MeetingAgendaItem[];
  minutes?: string;
  decisions: MeetingDecision[];
  actions: MeetingAction[];
  risks: MeetingRisk[];
  open_questions: string[];
  source_coverage: string[];
  confidence: number;
  assumptions: string[];
}

export interface MeetingArtifactResult {
  result: MeetingResult;
  approvalItemId: string | null;
  artifacts: Array<{
    id: string;
    path: string;
    format: string;
    persisted: boolean;
  }>;
}

export function generateMeetingAgenda(input: MeetingInput): MeetingResult {
  const agenda: MeetingAgendaItem[] = [];
  let seq = 1;

  if (input.objectives && input.objectives.length > 0) {
    for (const obj of input.objectives) {
      agenda.push({
        id: `agenda-${seq++}`,
        topic: obj,
        owner: undefined,
        duration_minutes: 10,
        objective: obj,
      });
    }
  }

  if (input.related_issue_ids && input.related_issue_ids.length > 0) {
    for (const issue of input.related_issue_ids) {
      agenda.push({
        id: `agenda-${seq++}`,
        topic: `Review issue: ${issue}`,
        owner: undefined,
        duration_minutes: 5,
        objective: `Status and blockers for ${issue}`,
      });
    }
  }

  if (input.open_action_ids && input.open_action_ids.length > 0) {
    for (const action of input.open_action_ids) {
      agenda.push({
        id: `agenda-${seq++}`,
        topic: `Follow-up action: ${action}`,
        owner: undefined,
        duration_minutes: 5,
        objective: `Verify completion or current state of ${action}`,
      });
    }
  }

  if (agenda.length === 0) {
    agenda.push({
      id: 'agenda-1',
      topic: 'General project sync',
      duration_minutes: 15,
      objective: 'Align on current status, blockers, and next steps.',
    });
  }

  const unavailable = input.unavailable_sources ?? [];
  const items = input.transcript ?? input.notes ?? '';
  const hasTranscript = Boolean(input.transcript && input.transcript.trim().length > 0);
  const sourceCoverage = [
    ...(hasTranscript ? ['transcript'] : []),
    ...(input.notes ? ['notes'] : []),
    ...(input.related_issue_ids && input.related_issue_ids.length > 0 ? ['issues'] : []),
    ...unavailable.map(source => `unavailable:${source}`),
  ];

  const confidence = Math.max(
    40,
    100 - unavailable.length * 10 - (agenda.length === 0 ? 30 : 0),
  );

  return {
    project_id: input.project_id,
    meeting_id: input.meeting_id,
    title: input.title,
    date: input.date,
    agenda,
    decisions: [],
    actions: [],
    risks: [],
    open_questions: [],
    source_coverage: sourceCoverage,
    confidence,
    assumptions: input.assumptions ?? ['Transcript replaced with synthetic items for test.'],
  };
}

export interface ParseMeetingInput {
  transcript?: string;
  notes?: string;
}

const ACTION_RE = /action[:\s-]+([^\n\r]+)/i;
const DECISION_RE = /decision[:\s-]+([^\n\r]+)/i;
const RISK_RE = /risk[:\s-]+([^\n\r]+)/i;
const QUESTION_RE = /open question[:\s-]+([^\n\r]+)/i;

export function parseMeetingNotes(input: ParseMeetingInput): Omit<MeetingResult, 'project_id' | 'meeting_id' | 'date' | 'source_coverage' | 'confidence' | 'assumptions'> {
  const text = `${input.transcript ?? ''}\n${input.notes ?? ''}`;
  const lines = text.split(/\r?\n/);

  const actions: MeetingAction[] = [];
  const decisions: MeetingDecision[] = [];
  const risks: MeetingRisk[] = [];
  const openQuestions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const actionMatch = trimmed.match(ACTION_RE);
    if (actionMatch) {
      actions.push({
        id: `action-${actions.length + 1}`,
        description: actionMatch[1].trim(),
        source: 'parsed-notes',
      });
      continue;
    }

    const decisionMatch = trimmed.match(DECISION_RE);
    if (decisionMatch) {
      decisions.push({
        id: `decision-${decisions.length + 1}`,
        description: decisionMatch[1].trim(),
      });
      continue;
    }

    const riskMatch = trimmed.match(RISK_RE);
    if (riskMatch) {
      risks.push({
        id: `risk-${risks.length + 1}`,
        description: riskMatch[1].trim(),
      });
      continue;
    }

    const questionMatch = trimmed.match(QUESTION_RE);
    if (questionMatch) {
      openQuestions.push(questionMatch[1].trim());
    }
  }

  return {
    title: 'Meeting',
    agenda: [],
    decisions,
    actions,
    risks,
    open_questions: openQuestions,
  };
}

// TODO: Wire generateMeetingIntelligenceForProject into artifact factory and approval queue
// (integration scaffolding left for next task)
