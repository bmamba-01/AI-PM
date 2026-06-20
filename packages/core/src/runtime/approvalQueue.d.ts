export type ApprovalStatus = 'draft' | 'pending' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';
export type ApprovalDecision = 'approve' | 'reject' | 'revision_requested' | 'cancel';
export interface ApprovalItem {
    approval_id: string;
    project_id: string;
    action_type: string;
    target_system: string;
    target_id: string;
    workflow_id: string;
    run_id: string;
    requested_by_agent: string;
    requested_by_role: string;
    title: string;
    description: string;
    summary_diff: string;
    confidence: number;
    source_refs: Array<{
        type: string;
        id: string;
        title?: string;
        accessed_at?: string;
    }>;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: ApprovalStatus;
    revision_round: number;
    deadline: string | null;
    ttl_seconds: number | null;
    assigned_approvers: string[];
    created_at: string;
    updated_at: string;
    decided_at: string | null;
    decided_by: string | null;
    decision: ApprovalDecision | null;
    rejection_reason: string | null;
    revision_notes: string | null;
    delegated_to: string | null;
    execution_status: 'pending' | 'executing' | 'executed' | 'execution_failed';
    execution_error: string | null;
    execution_target_response: string | null;
    retry_count: number;
    policy_rule_id: string | null;
}
export interface ApprovalAuditEntry {
    approval_id: string;
    event_type: string;
    actor: string;
    actor_type: 'human' | 'agent' | 'system';
    timestamp: string;
    details: Record<string, unknown>;
    previous_status: ApprovalStatus | null;
    new_status: ApprovalStatus | null;
}
export interface DecidePayload {
    decided_by: string;
    decision: ApprovalDecision;
    reason?: string;
    notes?: string;
}
export declare class ApprovalQueue {
    private readonly projectRoot;
    private readonly filePath;
    constructor(projectRoot: string);
    private ensureDir;
    private readAll;
    private writeAll;
    createItem(input: {
        project_id: string;
        action_type: string;
        target_system: string;
        target_id: string;
        workflow_id: string;
        run_id: string;
        requested_by_agent: string;
        requested_by_role: string;
        title: string;
        description: string;
        summary_diff: string;
        confidence: number;
        source_refs: ApprovalItem['source_refs'];
        priority: ApprovalItem['priority'];
        deadline?: string | null;
        ttl_seconds?: number | null;
        assigned_approvers?: string[];
    }): Promise<ApprovalItem>;
    getItem(id: string): Promise<ApprovalItem | null>;
    listItems(filter?: {
        status?: string;
        priority?: string;
    }): Promise<ApprovalItem[]>;
    decide(id: string, payload: DecidePayload): Promise<ApprovalItem>;
    resubmit(id: string, summary_diff: string): Promise<ApprovalItem>;
    getCounts(): Promise<Record<string, number>>;
}
//# sourceMappingURL=approvalQueue.d.ts.map