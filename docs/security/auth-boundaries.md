# Auth Boundaries

## Local Server

- Allowed: localhost connections without token (configurable).
- Optional token gate: set `PM_TOKEN` env var to require `X-PM-Token`.

## Chat/Mobile

- All write operations require valid token.
- Read operations may be public if server opts in.

## Desktop

- Desktop renderer calls setup via IPC only; no Node/core imports in renderer.
- Preload exposes a narrow API surface.

## Approval Actions

- Actor identity attached to each proposal and decision.
- Concurrent approvals handled via queue state machine.
