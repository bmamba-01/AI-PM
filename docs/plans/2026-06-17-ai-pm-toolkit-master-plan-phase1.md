## Phase 1: Core PM Domain Models & Local Database

### Task 3: Design Core Domain Models
**Objective:** Define TypeScript interfaces for Project, Sprint, Epic, Story, Task, Risk, Issue, Stakeholder, Timeline, Budget, Resource, Metrics

**Files:**
- Create: `packages/core/src/domain/models.ts`
- Create: `packages/core/src/domain/enums.ts` (ProjectType, Methodology, CostModel, Priority, Status, RiskLevel)
- Create: `packages/core/src/domain/events.ts` (domain events for event sourcing)

**Step 1:** Write enums: ProjectType (SOFTWARE, INFRA, DATA, RESEARCH), Methodology (WATERFALL, SCRUM, KANBAN, HYBRID), CostModel (TIME_MATERIAL, FIXED_COST, MILESTONE), Priority (P0-P4), Status, RiskLevel (LOW, MEDIUM, HIGH, CRITICAL)
**Step 2:** Write core models with all fields needed for complex project management
**Step 3:** Write domain events for audit trail
**Step 4:** Verify: TypeScript compiles without errors

---

### Task 4: Implement Local Database Layer (SQLite + Prisma/Drizzle)
**Objective:** Persistent local storage with full-text search, migrations, offline-first sync capability

**Files:**
- Create: `packages/core/src/db/schema.prisma` or `drizzle/schema.ts`
- Create: `packages/core/src/db/client.ts`
- Create: `packages/core/src/db/migrations/`
- Create: `packages/core/src/db/repositories/` (ProjectRepo, SprintRepo, TaskRepo, RiskRepo, etc.)

**Step 1:** Write schema with all domain models, indexes, relations
**Step 2:** Write database client with connection pooling
**Step 3:** Write repository pattern implementations
**Step 4:** Write migration scripts
**Step 5:** Verify: `pnpm db:migrate` and `pnpm db:seed` work

---

### Task 5: Implement Sync Engine (Online/Offline)
**Objective:** Conflict-free replicated data type (CRDT) or event-sourcing based sync for multi-device

**Files:**
- Create: `packages/core/src/sync/engine.ts`
- Create: `packages/core/src/sync/providers/` (local, github, gdrive, s3)
- Create: `packages/core/src/sync/conflict-resolution.ts`

**Step 1:** Design sync protocol (event log + vector clocks)
**Step 2:** Write sync engine with queue, retry, conflict resolution
**Step 3:** Write storage providers
**Step 4:** Verify: offline changes sync correctly when online