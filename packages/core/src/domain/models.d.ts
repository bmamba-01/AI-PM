import { ProjectType, Methodology, CostModel, Priority, Status, RiskLevel, TaskType, RoleType, MeetingType, GateStatus, BudgetAlertLevel } from "./enums.js";
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    version: number;
}
export interface Project extends BaseEntity {
    name: string;
    description: string;
    key: string;
    type: ProjectType;
    methodology: Methodology;
    costModel: CostModel;
    startDate: Date;
    endDate?: Date;
    budget?: Budget;
    clientId?: string;
    tags: string[];
    status: Status;
    healthScore: number;
    settings: ProjectSettings;
}
export interface ProjectSettings {
    workingDays: number[];
    hoursPerDay: number;
    sprintLength?: number;
    wipLimits?: Record<string, number>;
    autoAssign: boolean;
    notifications: NotificationSettings;
    integrations: IntegrationSettings;
}
export interface NotificationSettings {
    email: boolean;
    slack: boolean;
    push: boolean;
    inApp: boolean;
    digestFrequency: "immediate" | "hourly" | "daily" | "weekly";
}
export interface IntegrationSettings {
    jira?: {
        projectKey: string;
        url: string;
    };
    linear?: {
        teamId: string;
    };
    github?: {
        repo: string;
        owner: string;
    };
    gitlab?: {
        projectId: string;
    };
    slack?: {
        channelId: string;
    };
    teams?: {
        channelId: string;
    };
}
export interface Sprint extends BaseEntity {
    projectId: string;
    name: string;
    goal: string;
    startDate: Date;
    endDate: Date;
    status: Status;
    capacity: number;
    committedPoints: number;
    completedPoints: number;
    velocityHistory: VelocityPoint[];
}
export interface VelocityPoint {
    sprintId: string;
    planned: number;
    completed: number;
    date: Date;
}
export interface Epic extends BaseEntity {
    projectId: string;
    name: string;
    description: string;
    status: Status;
    priority: Priority;
    startDate?: Date;
    endDate?: Date;
    estimatedPoints: number;
    actualPoints: number;
    dependencies: string[];
    color: string;
}
export interface Story extends BaseEntity {
    projectId: string;
    epicId?: string;
    sprintId?: string;
    title: string;
    description: string;
    acceptanceCriteria: AcceptanceCriterion[];
    storyPoints?: number;
    priority: Priority;
    status: Status;
    assigneeId?: string;
    reporterId: string;
    labels: string[];
    dependencies: string[];
    blockedBy: string[];
    blocks: string[];
    timeTracking: TimeTracking;
    customFields: Record<string, unknown>;
}
export interface AcceptanceCriterion {
    id: string;
    description: string;
    isAutomated: boolean;
    testCaseId?: string;
    status: Status;
}
export interface Task extends BaseEntity {
    projectId: string;
    storyId?: string;
    sprintId?: string;
    title: string;
    description: string;
    type: TaskType;
    priority: Priority;
    status: Status;
    assigneeId?: string;
    estimatedHours?: number;
    actualHours: number;
    remainingHours?: number;
    storyPoints?: number;
    dependencies: string[];
    tags: string[];
    timeTracking: TimeTracking;
}
export interface TimeTracking {
    loggedHours: number;
    startedAt?: Date;
    pausedAt?: Date;
    completedAt?: Date;
    sessions: TimeSession[];
}
export interface TimeSession {
    id: string;
    userId: string;
    startedAt: Date;
    endedAt?: Date;
    duration: number;
    description?: string;
}
export interface Risk extends BaseEntity {
    projectId: string;
    title: string;
    description: string;
    probability: number;
    impact: number;
    level: RiskLevel;
    category: RiskCategory;
    status: RiskStatus;
    ownerId: string;
    mitigation: string;
    contingency?: string;
    triggers: string[];
    identifiedDate: Date;
    lastReviewDate: Date;
    nextReviewDate: Date;
    relatedEntities: RelatedEntity[];
    monteCarloData?: MonteCarloResult;
}
export declare enum RiskCategory {
    TECHNICAL = "TECHNICAL",
    SCHEDULE = "SCHEDULE",
    BUDGET = "BUDGET",
    RESOURCE = "RESOURCE",
    STAKEHOLDER = "STAKEHOLDER",
    EXTERNAL = "EXTERNAL",
    QUALITY = "QUALITY",
    SECURITY = "SECURITY",
    COMPLIANCE = "COMPLIANCE"
}
export declare enum RiskStatus {
    IDENTIFIED = "IDENTIFIED",
    ASSESSED = "ASSESSED",
    MITIGATING = "MITIGATING",
    MONITORING = "MONITORING",
    CLOSED = "CLOSED",
    REALIZED = "REALIZED"
}
export interface RelatedEntity {
    type: "story" | "task" | "epic" | "sprint" | "milestone";
    id: string;
}
export interface MonteCarloResult {
    iterations: number;
    p10: number;
    p50: number;
    p90: number;
    mean: number;
    stdDev: number;
    histogram: {
        bin: number;
        count: number;
    }[];
}
export interface Issue extends BaseEntity {
    projectId: string;
    title: string;
    description: string;
    severity: Priority;
    status: Status;
    reporterId: string;
    assigneeId?: string;
    relatedRisks: string[];
    relatedTasks: string[];
    rootCause?: string;
    resolution?: string;
    resolvedAt?: Date;
}
export interface Stakeholder extends BaseEntity {
    projectId: string;
    userId: string;
    name: string;
    email: string;
    role: RoleType;
    influence: "HIGH" | "MEDIUM" | "LOW";
    interest: "HIGH" | "MEDIUM" | "LOW";
    communicationPreferences: CommunicationPreference[];
    raci: "R" | "A" | "C" | "I";
}
export interface CommunicationPreference {
    channel: "email" | "slack" | "teams" | "in_app" | "sms";
    frequency: "immediate" | "daily" | "weekly" | "on_change";
    types: string[];
}
export interface Budget extends BaseEntity {
    projectId: string;
    totalBudget: number;
    currency: string;
    costModel: CostModel;
    rateCardId?: string;
    milestones: MilestoneBudget[];
    alerts: BudgetAlert[];
    actuals: BudgetActual[];
    forecast: BudgetForecast;
}
export interface MilestoneBudget {
    id: string;
    name: string;
    date: Date;
    plannedAmount: number;
    actualAmount: number;
    invoiceId?: string;
    status: GateStatus;
}
export interface BudgetAlert {
    id: string;
    level: BudgetAlertLevel;
    threshold: number;
    message: string;
    triggeredAt?: Date;
    acknowledged: boolean;
}
export interface BudgetActual {
    date: Date;
    amount: number;
    category: "labor" | "materials" | "tools" | "travel" | "other";
    description: string;
    timeEntryId?: string;
    expenseId?: string;
}
export interface BudgetForecast {
    estimatedTotal: number;
    estimatedCompletionDate: Date;
    confidence: number;
    scenarios: {
        best: number;
        likely: number;
        worst: number;
    };
}
export interface TimeEntry extends BaseEntity {
    projectId: string;
    taskId?: string;
    userId: string;
    date: Date;
    hours: number;
    description: string;
    billable: boolean;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: Date;
}
export interface Expense extends BaseEntity {
    projectId: string;
    userId: string;
    date: Date;
    amount: number;
    currency: string;
    category: string;
    description: string;
    receiptUrl?: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
    approvedBy?: string;
    approvedAt?: Date;
}
export interface RateCard extends BaseEntity {
    name: string;
    description?: string;
    rates: RoleRate[];
    effectiveFrom: Date;
    effectiveTo?: Date;
    isDefault: boolean;
}
export interface RoleRate {
    role: RoleType;
    seniority: "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL";
    hourlyRate: number;
    currency: string;
}
export interface Milestone extends BaseEntity {
    projectId: string;
    name: string;
    description: string;
    date: Date;
    status: GateStatus;
    deliverables: Deliverable[];
    dependencies: string[];
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: Date;
}
export interface Deliverable {
    id: string;
    name: string;
    description: string;
    acceptanceCriteria: string[];
    status: Status;
    artifacts: Artifact[];
}
export interface Artifact {
    id: string;
    name: string;
    type: "document" | "code" | "design" | "test" | "deploy" | "other";
    url?: string;
    path?: string;
    version: string;
    size?: number;
    checksum?: string;
}
export interface Meeting extends BaseEntity {
    projectId?: string;
    title: string;
    type: MeetingType;
    description?: string;
    scheduledAt: Date;
    duration: number;
    attendees: MeetingAttendee[];
    agenda: AgendaItem[];
    notes?: string;
    recordingUrl?: string;
    transcriptId?: string;
    actionItems: ActionItem[];
    decisions: Decision[];
}
export interface MeetingAttendee {
    userId: string;
    name: string;
    email: string;
    role: "organizer" | "required" | "optional";
    status: "accepted" | "declined" | "tentative" | "no_response";
}
export interface AgendaItem {
    id: string;
    title: string;
    description?: string;
    duration: number;
    ownerId: string;
    order: number;
    status: "pending" | "in_progress" | "completed" | "skipped";
}
export interface ActionItem {
    id: string;
    description: string;
    assigneeId: string;
    dueDate?: Date;
    priority: Priority;
    status: Status;
    relatedTaskId?: string;
    relatedStoryId?: string;
    meetingId: string;
}
export interface Decision {
    id: string;
    description: string;
    rationale: string;
    madeBy: string[];
    date: Date;
    relatedEntities: RelatedEntity[];
}
export interface Document extends BaseEntity {
    projectId: string;
    title: string;
    type: "BRD" | "PRD" | "TRD" | "TEST_PLAN" | "ARCHITECTURE" | "DESIGN" | "MANUAL" | "OTHER";
    content: string;
    docVersion: string;
    status: "DRAFT" | "REVIEW" | "APPROVED" | "ARCHIVED";
    tags: string[];
    relatedEntities: RelatedEntity[];
}
export interface User extends BaseEntity {
    email: string;
    name: string;
    avatarUrl?: string;
    role: RoleType;
    seniority: "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL";
    skills: string[];
    timezone: string;
    workingHours: WorkingHours;
    preferences: UserPreferences;
}
export interface WorkingHours {
    timezone: string;
    schedule: DaySchedule[];
}
export interface DaySchedule {
    day: number;
    start: string;
    end: string;
    breaks: Break[];
}
export interface Break {
    start: string;
    end: string;
}
export interface UserPreferences {
    theme: "light" | "dark" | "system";
    language: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
    notifications: NotificationSettings;
}
export interface Team extends BaseEntity {
    name: string;
    description: string;
    projectId: string;
    members: TeamMember[];
    velocity: number;
    capacity: number;
}
export interface TeamMember {
    userId: string;
    role: RoleType;
    allocation: number;
    startDate: Date;
    endDate?: Date;
}
export interface WorkflowState {
    name: string;
    category: "todo" | "in_progress" | "done";
    order: number;
    wipLimit?: number;
    description?: string;
}
export interface Workflow extends BaseEntity {
    projectId: string;
    name: string;
    states: WorkflowState[];
    transitions: Transition[];
    isDefault: boolean;
}
export interface Transition {
    from: string;
    to: string;
    conditions?: string[];
    actions?: string[];
}
export interface CustomField {
    id: string;
    name: string;
    type: "text" | "number" | "date" | "select" | "multi_select" | "boolean" | "user";
    required: boolean;
    options?: string[];
    defaultValue?: unknown;
    projectId: string;
}
//# sourceMappingURL=models.d.ts.map