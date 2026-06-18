import { BaseEntity } from "./models.js";

export type DomainEventType =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "sprint.created"
  | "sprint.started"
  | "sprint.completed"
  | "epic.created"
  | "epic.updated"
  | "story.created"
  | "story.updated"
  | "story.assigned"
  | "story.status_changed"
  | "story.points_changed"
  | "task.created"
  | "task.updated"
  | "task.assigned"
  | "task.status_changed"
  | "task.time_logged"
  | "risk.identified"
  | "risk.assessed"
  | "risk.mitigated"
  | "risk.closed"
  | "issue.created"
  | "issue.resolved"
  | "meeting.scheduled"
  | "meeting.completed"
  | "action_item.created"
  | "action_item.completed"
  | "decision.made"
  | "budget.updated"
  | "budget.alert_triggered"
  | "time_entry.logged"
  | "expense.logged"
  | "milestone.reached"
  | "deliverable.submitted"
  | "document.approved"
  | "user.assigned_to_project"
  | "team.velocity_updated";

export interface DomainEvent<T = unknown> extends BaseEntity {
  type: DomainEventType;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  tags: string[];
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(type: DomainEventType, fromDate?: Date): Promise<DomainEvent[]>;
  getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: DomainEventType, handler: EventHandler): Promise<void>;
  unsubscribe(type: DomainEventType, handler: EventHandler): Promise<void>;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface Projection {
  project(event: DomainEvent): Promise<void>;
  getState(aggregateId: string): Promise<unknown>;
  reset(aggregateId: string): Promise<void>;
}

export const createEvent = <T>(
  type: DomainEventType,
  aggregateId: string,
  aggregateType: string,
  payload: T,
  metadata: Partial<EventMetadata> = {}
): DomainEvent<T> => ({
  id: crypto.randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: metadata.userId || "system",
  version: 1,
  type,
  aggregateId,
  aggregateType,
  payload,
  metadata: {
    correlationId: metadata.correlationId,
    causationId: metadata.causationId,
    userId: metadata.userId,
    sessionId: metadata.sessionId,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    tags: metadata.tags || []
  }
});
