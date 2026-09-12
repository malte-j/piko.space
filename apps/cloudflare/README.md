# piko.space on Cloudflare Workers

This is the full-stack replacement for the legacy `frontend`, `backend`, and `og` services. Vite serves the React PWA and Hono Worker from one origin. Each document is coordinated and stored by a SQLite-backed Durable Object; D1 stores titles and per-user recent-file indexes.

## Local development

Replace the placeholder D1 `database_id` in `wrangler.jsonc` before a remote deployment. For local work:

```bash
pnpm install
pnpm --filter cloudflare cf-typegen
pnpm --filter cloudflare d1:migrate:local
pnpm --filter cloudflare dev
```

Set local-only secrets in `.dev.vars`, which is ignored by the repository. The committed `.dev.vars.example` contains names only.

## Deployment

Create a D1 database named `piko-space`, put its ID in `wrangler.jsonc`, apply migrations, configure `MIGRATION_TOKEN` interactively with `wrangler secret put`, and deploy:

```bash
pnpm --filter cloudflare d1:migrate:remote
pnpm --filter cloudflare run deploy:dry-run
pnpm --filter cloudflare run deploy
```

Keep `MIGRATION_ENABLED` false except during the one-shot import.

## Redis migration

The export is read-only and writes a new manifest using exclusive file creation. Run it against the legacy Redis instance:

```bash
pnpm --filter cloudflare migrate:export ./migration-manifest.json --exclude-known-invalid
MIGRATION_TOKEN=... pnpm --filter cloudflare migrate:import ./migration-manifest.json https://staging.example.com
MIGRATION_TOKEN=... pnpm --filter cloudflare migrate:verify ./migration-manifest.json https://staging.example.com
```

The importer is idempotent. `--force` replaces a conflicting destination snapshot and must only be used before traffic is enabled. Because cutover is deliberately one-shot, Redis edits made after export begins can be lost.

`--exclude-known-invalid` excludes only the two oversized legacy IDs reviewed during the migration inventory. Their SHA-256 fingerprints and data-presence flags are retained in the manifest as an audit record; any new incompatible ID still stops the export.

After verification, route the production domain to this Worker and retain Fly/Redis for seven days. Rolling DNS back during that period does not copy Cloudflare edits into Redis, so those edits would be lost. After the observation window, set `MIGRATION_ENABLED` to false, delete the migration secret, and retire the legacy services.
