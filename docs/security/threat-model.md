# Threat Model

## Scope

Local server, chat adapter, mobile client, desktop Electron app.

## Trust Boundaries

- Localhost (desktop + local server): trusted by default, no auth required unless explicitly enabled.
- Chat/mobile: token required for all write operations.
- External connectors: approval-gated only; no direct execution.

## Threats

- Token theft from environment variables or IPC: minimize token lifetime; no secrets in approval items.
- Man-in-the-middle on local server: prefer localhost-only binding; no public exposure by default.
- Unsanitized approval payloads: validate all approval action inputs server-side.
- Device theft (mobile): encrypted local queue, stale action rejection after TTL.

## Mitigations

- Auth via `X-PM-Token` header or `PM_TOKEN` env var.
- Unauthorized requests rejected with 401.
- Audit actor recorded for every mutation.
