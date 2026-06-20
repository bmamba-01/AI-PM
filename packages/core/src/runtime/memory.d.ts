export type ArtifactStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export interface MemoryTask {
    task_id: string;
    project_id: string;
    name: string;
    description: string;
    status: TaskStatus;
    assigned_to: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    dependencies: string[];
    artifacts: string[];
    tags: string[];
}
export interface MemoryArtifact {
    artifact_id: string;
    project_id: string;
    name: string;
    path: string;
    type: string;
    status: ArtifactStatus;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
    archive_reason: string | null;
    task_id: string | null;
    version: number;
}
export interface MemoryState {
    version: number;
    project_id: string;
    tasks: MemoryTask[];
    artifacts: MemoryArtifact[];
    updated_at: string;
}
export interface MemorySummary {
    totalTasks: number;
    completedTasks: number;
    totalArtifacts: number;
    archivedArtifacts: number;
    staleArtifacts: number;
}
export declare class MemoryStore {
    private readonly projectRoot;
    private readonly filePath;
    constructor(projectRoot: string);
    private ensureDir;
    private readState;
    private writeState;
    private emptyState;
    getState(): Promise<MemoryState>;
    createTask(input: Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>): Promise<MemoryTask>;
    updateTask(taskId: string, updates: Partial<MemoryTask>): Promise<MemoryTask>;
    completeTask(taskId: string): Promise<MemoryTask>;
    getTask(taskId: string): Promise<MemoryTask | null>;
    listTasks(filter?: {
        status?: TaskStatus;
    }): Promise<MemoryTask[]>;
    createArtifact(input: Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>): Promise<MemoryArtifact>;
    updateArtifact(artifactId: string, updates: Partial<MemoryArtifact>): Promise<MemoryArtifact>;
    archiveArtifact(artifactId: string, reason: string): Promise<MemoryArtifact>;
    getArtifact(artifactId: string): Promise<MemoryArtifact | null>;
    listArtifacts(filter?: {
        status?: ArtifactStatus;
        type?: string;
    }): Promise<MemoryArtifact[]>;
    getTaskArtifacts(taskId: string): Promise<MemoryArtifact[]>;
    autoArchiveCompleted(maxAgeDays?: number): Promise<MemoryArtifact[]>;
    getStaleArtifacts(maxAgeDays?: number): Promise<MemoryArtifact[]>;
    getSummary(): Promise<MemorySummary>;
}
//# sourceMappingURL=memory.d.ts.map