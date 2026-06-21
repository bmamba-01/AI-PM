# Getting Started

## Prerequisites

- Node.js 18+
- `corepack` (bundled with Node 18+)
- Git
- Bash (Git Bash, WSL, or MSYS2 on Windows)

## Install

```bash
corepack enable
corepack pnpm@9.4.0 install
```

## Build

```bash
corepack pnpm@9.4.0 -r run build
```

## First Project (CLI)

```bash
node packages/cli/bin/ai-pm.js init MyProject --defaults --json
node packages/cli/bin/ai-pm.js project scan --json
node packages/cli/bin/ai-pm.js daily --help
```

## First Project (Desktop)

Open desktop app → choose **New Project** → run with defaults → readiness score appears → open dashboard.

## First Daily Brief

```bash
node packages/cli/bin/ai-pm.js daily run --json
```

## Verify Setup

```bash
node packages/cli/bin/ai-pm.js setup doctor --json
```
