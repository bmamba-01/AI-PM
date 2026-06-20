# Contributing Guidelines

## Welcome

Thank you for contributing to AI-PM Toolkit. This guide covers how to set up, develop, and submit changes.

## Prerequisites

- Node.js 18+
- pnpm (workspace manager)
- Git

## Setup

```bash
git clone <repo-url>
cd AI-PM
pnpm install
pnpm build
pnpm test
```

## Project Structure

```
AI-PM/
├── packages/
│   ├── core/       # Runtime classes (ApprovalQueue, MemoryStore, etc.)
│   ├── cli/        # CLI commands
│   ├── desktop/    # Electron app
│   ├── mobile/     # React Native app
│   ├── mcp/        # MCP server wrappers
│   └── shared/     # Shared types
├── docs/           # Operating layer documentation
│   ├── developer/  # Developer docs
│   ├── product/    # Product specs
│   ├── architecture/
│   └── operating-model/
├── schemas/        # JSON schemas for workflows
├── workflows/      # Workflow definitions
├── playbooks/      # Role and methodology playbooks
└── templates/      # PM templates
```

## Development Workflow

### 1. Read the Operating Layer First

Before writing code, read:
- `AGENTS.md` — entry point
- `docs/superpowers/specs/` — design baseline
- `docs/superpowers/plans/` — active implementation plan

### 2. Pick a Task

Tasks are tracked in `docs/superpowers/plans/2026-06-19-next-runtime-functions.md` and `docs/agent-delegation/`.

### 3. Branch and Implement

```bash
git checkout -b feature/my-feature
# Make changes
pnpm build
pnpm test
```

### 4. Verification Before Submitting

Run the full verification gate:

```bash
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/mcp test
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/desktop build
pnpm --filter @ai-pm/mobile build
pnpm build
```

## Code Guidelines

### Core Package (`@ai-pm/core`)

- File-backed stores use `.ai-pm/` directory
- All stores handle `ENOENT` gracefully (return empty, not error)
- Validation throws descriptive `Error` messages
- No external dependencies beyond Node.js built-ins
- Tests use temp directories for isolation

### Desktop Package (`@ai-pm/desktop`)

- **No `@ai-pm/core/runtime` imports in renderer code**
- All file operations go through IPC (`window.electronAPI.*`)
- Zustand for state management
- Glassmorphism + Apple palette for UI

### Mobile Package (`@ai-pm/mobile`)

- **No Node.js APIs** — React Native environment
- **No `@ai-pm/core/runtime` imports** — types defined locally
- Fetch-based API client with mock fallback
- Zustand for state management

### CLI Package (`@ai-pm/cli`)

- Commander.js for command structure
- `chalk` for colored output
- `table` for formatted tables
- `--json` flag on all list/show commands
- Bilingual message support

### Documentation

- Markdown format
- Include frontmatter (date, status, audience, references)
- Link to related docs
- Keep API references with method signatures and examples

## Commit Messages

Follow conventional commits:

```
feat: add memory store lifecycle methods
fix: correct approval state transition for expired items
docs: add testing guide
test: add integration tests for approval queue
chore: update dependencies
```

## Architecture Rules

1. **UI packages must not own business rules** — logic belongs in `@ai-pm/core`
2. **No localStorage as source of truth** — file-backed or server-backed only
3. **No Node.js APIs in renderer/mobile** — use IPC or fetch
4. **No external dependencies in core** — Node.js built-ins only
5. **Approval policy is read-only by default** — mutations require explicit approval

## Reporting Issues

- Use GitHub Issues
- Include: steps to reproduce, expected vs actual behavior, package affected
- For security issues, follow responsible disclosure in `docs/operating-model/approval-policy.md`

## License

See LICENSE file in repository root.
