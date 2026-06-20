import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const DEFAULT_STALE_DAYS = 30;
const DEFAULT_ARCHIVE_DAYS = 7;
function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
export class MemoryStore {
    projectRoot;
    filePath;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.filePath = path.join(projectRoot, '.ai-pm', 'memory', 'state.json');
    }
    async ensureDir() {
        await mkdir(path.dirname(this.filePath), { recursive: true });
    }
    async readState() {
        try {
            const raw = await readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks) && Array.isArray(parsed.artifacts)) {
                return parsed;
            }
            return this.emptyState();
        }
        catch (error) {
            if (isNodeError(error) && error.code === 'ENOENT')
                return this.emptyState();
            throw error;
        }
    }
    async writeState(state) {
        await this.ensureDir();
        state.updated_at = new Date().toISOString();
        await writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
    }
    emptyState() {
        return {
            version: 1,
            project_id: '',
            tasks: [],
            artifacts: [],
            updated_at: new Date().toISOString(),
        };
    }
    // --- State ---
    async getState() {
        return this.readState();
    }
    // --- Tasks ---
    async createTask(input) {
        if (!input.name || !input.project_id) {
            throw new Error('Missing required fields: name, project_id');
        }
        const now = new Date().toISOString();
        const task = {
            ...input,
            task_id: randomUUID(),
            completed_at: input.completed_at ?? null,
            dependencies: input.dependencies ?? [],
            artifacts: input.artifacts ?? [],
            tags: input.tags ?? [],
            created_at: now,
            updated_at: now,
        };
        const state = await this.readState();
        state.project_id = state.project_id || input.project_id;
        state.tasks.push(task);
        await this.writeState(state);
        return task;
    }
    async updateTask(taskId, updates) {
        const state = await this.readState();
        const idx = state.tasks.findIndex(t => t.task_id === taskId);
        if (idx === -1)
            throw new Error(`Task ${taskId} not found`);
        const task = state.tasks[idx];
        const { task_id, created_at, ...safe } = updates;
        Object.assign(task, safe, { updated_at: new Date().toISOString() });
        state.tasks[idx] = task;
        await this.writeState(state);
        return task;
    }
    async completeTask(taskId) {
        const state = await this.readState();
        const idx = state.tasks.findIndex(t => t.task_id === taskId);
        if (idx === -1)
            throw new Error(`Task ${taskId} not found`);
        const now = new Date().toISOString();
        state.tasks[idx].status = 'completed';
        state.tasks[idx].completed_at = now;
        state.tasks[idx].updated_at = now;
        await this.writeState(state);
        return state.tasks[idx];
    }
    async getTask(taskId) {
        const state = await this.readState();
        return state.tasks.find(t => t.task_id === taskId) ?? null;
    }
    async listTasks(filter) {
        const state = await this.readState();
        if (filter?.status)
            return state.tasks.filter(t => t.status === filter.status);
        return state.tasks;
    }
    // --- Artifacts ---
    async createArtifact(input) {
        if (!input.name || !input.project_id) {
            throw new Error('Missing required fields: name, project_id');
        }
        const now = new Date().toISOString();
        const artifact = {
            ...input,
            artifact_id: randomUUID(),
            task_id: input.task_id ?? null,
            archived_at: null,
            archive_reason: null,
            version: 1,
            created_at: now,
            updated_at: now,
        };
        const state = await this.readState();
        state.artifacts.push(artifact);
        // Link to originating task if present
        if (artifact.task_id) {
            const task = state.tasks.find(t => t.task_id === artifact.task_id);
            if (task && !task.artifacts.includes(artifact.artifact_id)) {
                task.artifacts.push(artifact.artifact_id);
            }
        }
        await this.writeState(state);
        return artifact;
    }
    async updateArtifact(artifactId, updates) {
        const state = await this.readState();
        const idx = state.artifacts.findIndex(a => a.artifact_id === artifactId);
        if (idx === -1)
            throw new Error(`Artifact ${artifactId} not found`);
        const artifact = state.artifacts[idx];
        const { artifact_id, created_at, ...safe } = updates;
        Object.assign(artifact, safe, {
            updated_at: new Date().toISOString(),
            version: artifact.version + 1,
        });
        state.artifacts[idx] = artifact;
        await this.writeState(state);
        return artifact;
    }
    async archiveArtifact(artifactId, reason) {
        const state = await this.readState();
        const idx = state.artifacts.findIndex(a => a.artifact_id === artifactId);
        if (idx === -1)
            throw new Error(`Artifact ${artifactId} not found`);
        const now = new Date().toISOString();
        const artifact = state.artifacts[idx];
        artifact.status = 'archived';
        artifact.archived_at = now;
        artifact.archive_reason = reason;
        artifact.updated_at = now;
        state.artifacts[idx] = artifact;
        await this.writeState(state);
        return artifact;
    }
    async getArtifact(artifactId) {
        const state = await this.readState();
        return state.artifacts.find(a => a.artifact_id === artifactId) ?? null;
    }
    async listArtifacts(filter) {
        const state = await this.readState();
        let result = state.artifacts;
        if (filter?.status)
            result = result.filter(a => a.status === filter.status);
        if (filter?.type)
            result = result.filter(a => a.type === filter.type);
        return result;
    }
    async getTaskArtifacts(taskId) {
        const state = await this.readState();
        const task = state.tasks.find(t => t.task_id === taskId);
        if (!task)
            return [];
        return state.artifacts.filter(a => task.artifacts.includes(a.artifact_id));
    }
    // --- Lifecycle ---
    async autoArchiveCompleted(maxAgeDays = DEFAULT_ARCHIVE_DAYS) {
        const state = await this.readState();
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        const archived = [];
        const now = new Date().toISOString();
        for (const task of state.tasks) {
            if (task.status !== 'completed' || !task.completed_at)
                continue;
            const completedTime = new Date(task.completed_at).getTime();
            if (completedTime >= cutoff)
                continue;
            for (const artId of task.artifacts) {
                const idx = state.artifacts.findIndex(a => a.artifact_id === artId);
                if (idx === -1)
                    continue;
                const art = state.artifacts[idx];
                if (art.status !== 'active')
                    continue;
                art.status = 'archived';
                art.archived_at = now;
                art.archive_reason = `Auto-archived: task "${task.name}" completed ${new Date(task.completed_at).toISOString().slice(0, 10)}`;
                art.updated_at = now;
                archived.push(art);
            }
        }
        if (archived.length > 0)
            await this.writeState(state);
        return archived;
    }
    async getStaleArtifacts(maxAgeDays = DEFAULT_STALE_DAYS) {
        const state = await this.readState();
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        return state.artifacts.filter(a => {
            if (a.status === 'archived' || a.status === 'deleted')
                return false;
            return new Date(a.updated_at).getTime() < cutoff;
        });
    }
    // --- Summary ---
    async getSummary() {
        const state = await this.readState();
        const stale = await this.getStaleArtifacts();
        return {
            totalTasks: state.tasks.length,
            completedTasks: state.tasks.filter(t => t.status === 'completed').length,
            totalArtifacts: state.artifacts.length,
            archivedArtifacts: state.artifacts.filter(a => a.status === 'archived').length,
            staleArtifacts: stale.length,
        };
    }
}
//# sourceMappingURL=memory.js.map