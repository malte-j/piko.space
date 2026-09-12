# Project current state

## What this is

piko.space is a collaborative, offline-capable note editor. The editor uses TipTap/ProseMirror, Yjs for shared state, IndexedDB for local persistence, and a Yjs WebSocket connection for live collaboration. Firebase supplies authentication. The canonical application now runs on Cloudflare Workers, using SQLite-backed Durable Objects for Yjs documents and D1 for metadata and recent-file history.

## Repository layout

This is a pnpm workspace centered on the canonical Cloudflare application:

- `apps/cloudflare`: React 18 + TypeScript + Vite full-stack app. A Hono Worker serves the API and SPA, one SQLite-backed Durable Object coordinates each document, D1 stores metadata, and the Worker renders Open Graph images.

The other apps and their deployment configuration are deprecated legacy code retained only as a temporary rollback path. Do not modify or use them unless the task explicitly concerns the legacy stack.

## Main data flow

1. The frontend creates a Yjs document per file and persists it locally as `ydoc_<fileId>`.
2. `y-websocket` connects on the same origin and syncs the document and collaborator awareness through its named Durable Object.
3. Each Durable Object persists snapshots and update tails in its own SQLite storage.
4. Hono routes expose metadata and recent files from D1; authenticated mutations verify Firebase ID tokens.
5. The Worker injects per-document metadata and renders versioned Open Graph images.

## Local development

The supported runtime is Node 24 with pnpm.

```bash
pnpm install
pnpm start
```

`pnpm start` starts the Cloudflare application with local Durable Object and D1 storage. Do not commit secrets, migration tokens, or generated migration manifests.

Useful checks/builds:

```bash
pnpm check:cloudflare
```

The Cloudflare check runs strict TypeScript validation, the workerd-backed Vitest suite, and the production build. Also use a manual multi-browser collaboration smoke test for changes to Yjs or WebSocket behavior.

## Deployment convention

Whenever telling the user how to deploy the Cloudflare application, always give this root-level command:

```bash
pnpm deploy:cloudflare
```

Do not substitute `pnpm --filter cloudflare deploy` or another equivalent command in user-facing instructions.

## Current caveats

- Much of the editor dependency stack remains pinned to 2022-era TipTap beta versions; upgrades should be incremental and tested across the Yjs protocol boundary.
- The Cloudflare frontend derives HTTP and WebSocket endpoints from the current origin; do not reintroduce separate backend URL environment variables.
- Cloudflare document IDs must be 1–128 URL-safe alphanumeric, underscore, or hyphen characters.
- Migration endpoints are controlled by `MIGRATION_ENABLED` and protected by the `MIGRATION_TOKEN` Worker secret. Disable them and remove the secret after migration work is complete.
- The Redis-to-Cloudflare migration has been verified for 1,456 documents, 284 titled documents, 1,264 recent-file associations, and 159 users.
- Deprecated legacy apps remain as a temporary rollback path, but Cloudflare edits are not copied back to them.
- pnpm is the workspace package manager of record.
