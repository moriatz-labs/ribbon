# VSCD Technical Design

## Goals

VSCD turns a short product request into a repeatable project lifecycle: scaffold, implement, check, release, register, and return URLs. It is optimized for roughly ten independent hobby projects that share an owner and design language but should not share failure domains or provider quotas.

## Non-Goals

- VSCD is not a Kubernetes platform or a general-purpose infrastructure orchestrator.
- It does not put a long-running backend on Vercel. Generated apps use browser-to-Supabase CRUD plus short serverless endpoints for trusted operations.
- It does not scrape or proxy third-party services from Cloudflare.
- It never stores raw provider secrets in `vscd.json`, the registry table, or browser storage.

## Implementation Status

| Capability | Implementation |
|---|---|
| Project manifest | `vscd.json` validated by Zod and JSON Schema |
| Local registry | Atomic JSON registry at `%USERPROFILE%\.vscd\registry.json` |
| Remote registry | Supabase `vscd_projects` table with owner-only RLS |
| Environment audit | `vscd doctor` checks CLIs and authenticated sessions |
| Provider inventory | `vscd inventory` reads Supabase and Vercel accounts |
| Project generation | `vscd init` copies and parameterizes `templates/crud-app` |
| Codex gate | `vscd check` validates files, lockfile, RLS, tests, secrets, DNS mode, workflows |
| Vercel integration | REST client plus pinned CLI workflow using prebuilt deployments |
| Supabase integration | Management API client, migrations, Auth, Storage, and pgTAP tests |
| Cloudflare integration | Idempotent CNAME upsert with `proxied: false` |
| Design system | Tokens, typography, layout, icon, and responsive rules embedded in template |
| URL handoff | GitHub workflow emits `deployment.json`; registry command lists known URLs |

## Manifest Contract

Every project contains a `vscd.json` manifest with stable identity, provider references, URLs, status, and design-system source. Provider IDs are metadata, not credentials. Cloudflare's `proxied` field is a literal `false`, so invalid runtime topology is rejected before release.

State transitions are monotonic in normal operation:

```text
draft -> local -> preview -> production -> archived
```

Rollback changes a deployment alias or project URL but does not rewrite the project's creation history.

## Supabase Schema Rules

1. Every table in an exposed schema enables RLS in the same migration that creates the table.
2. Every policy specifies a target role with `TO authenticated` or `TO anon`.
3. Ownership policies use `(select auth.uid()) = owner_id` and index `owner_id`.
4. Update policies include both `USING` and `WITH CHECK`; a matching select policy exists.
5. Authorization data lives in `app_metadata`, never user-editable `user_metadata`.
6. Views exposed to users use `security_invoker = true`; privileged functions stay outside exposed schemas.
7. Service-role and secret keys never enter browser-prefixed environment variables.
8. Storage buckets default to private. Object policies constrain the first path segment to the authenticated user ID.
9. SQL tests cover RLS enabled state, policy count, owner access, cross-user denial, anonymous denial, and storage privacy.
10. `supabase db advisors` runs before a production schema release when a linked project is available.

## Provider APIs

### Vercel

Use the CLI for project linking, environment pulls, builds, inspection, and promotion. Use the REST API for inventory and control-plane views. CI pins Vercel CLI `50.28.0`; it pulls production settings, builds once, and deploys with `--prebuilt`.

Required CI secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

### Supabase

Use Supabase CLI for local development, migrations, type generation, tests, and project linking. Use the Management API for inventory and opt-in provisioning. Personal automation uses a PAT; third-party delegated automation must use OAuth2.

Required public variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

Required provisioning secret: `SUPABASE_ACCESS_TOKEN`. A generated database password is passed directly to the create-project call and is never persisted by VSCD.

### Cloudflare

Use REST API tokens, not the Global API key. The default token has only zone read and DNS edit permissions for the selected zone. DNS upserts first query by type and name, then `PATCH` an existing record or `POST` a new one. Vercel CNAME records always set `ttl: 1` and `proxied: false`.

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`. `CUSTOM_DOMAIN` is a GitHub Actions variable, not a secret.

## Build And Deploy Performance

Generated side projects are deliberately standalone Vite apps. A single app does not pay the complexity cost of a monorepo or Turborepo. Fast release comes from a frozen pnpm lockfile, GitHub's pnpm download cache, one TypeScript/Vite build, and a Vercel prebuilt upload.

VSCD itself is a monorepo because the console, CLI, and core package share code. Turborepo runs independent tasks in parallel and caches declared `dist/**` outputs. Vercel automatically skips unchanged workspace projects when the repository is connected through GitHub. Remote cache inputs include only environment values that affect the app build, preserving useful cache hits.

Performance rules:

- Pin Node, pnpm, Supabase CLI, and Vercel CLI versions in CI.
- Use `pnpm install --frozen-lockfile`.
- Cancel superseded CI and production runs with workflow concurrency.
- Build once, test the artifact, and deploy with `--prebuilt`; never rebuild the same commit for promotion.
- Keep environment variables scoped to the tasks that consume them.
- Cache package-manager downloads, not `node_modules` or secrets.
- Keep Vite output static where possible; use Vercel Functions only for trusted operations.
- Do not use an ignored-build script when Vercel can skip unaffected workspace projects without consuming a build slot.

## Codex Check

`vscd check` is a deterministic release precondition. It fails when:

- `package.json`, `.env.example`, `vscd.json`, a single lockfile, or GitHub Actions are missing;
- the manifest enables Cloudflare proxying for a Vercel hostname;
- browser source references a service-role, Cloudflare, or Vercel secret;
- a created public table lacks `ENABLE ROW LEVEL SECURITY`;
- no Supabase SQL tests exist.

Product-specific checks still run through each repository's normal test, lint, typecheck, and build commands.

## Failure And Recovery

- Provider provisioning is idempotent where possible. Inventory runs before create operations.
- A failed DNS update leaves the Vercel deployment URL usable and reports the custom-domain step separately.
- A failed production deployment does not modify the Cloudflare record.
- Database migrations complete before a deployment is promoted. Destructive migrations require an explicit rollback plan.
- Provider URLs are recorded only after the corresponding API reports success.

## Rollout

1. Use VSCD locally to scaffold and validate People Aggregator.
2. Create a dedicated Supabase project for the VSCD registry and apply the root migration.
3. Create a Vercel project for `apps/console`, configure public Supabase variables, and protect the GitHub production environment.
4. Add a narrowly scoped Cloudflare token and zone ID to GitHub Actions.
5. Connect a custom DNS-only hostname and verify Vercel certificate issuance.
6. Register People Aggregator and return its preview/production URLs.

