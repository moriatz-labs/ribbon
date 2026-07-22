# VSCD Technical Design

## Goals

VSCD turns a product request into a repeatable lifecycle: select a provider profile, scaffold, implement, check, release, register, and return URLs. Products remain independent repositories and do not share provider failure domains.

The basic profile is Hostinger DNS + Supabase + Vercel. It is a default, not a hard-coded architecture.

## Capability Model

`vscd.json` version 2 has four operational slots:

- `providers.dns`: `hostinger` or `cloudflare`;
- `providers.backend`: `supabase` or `firebase`;
- `providers.deployment`: `vercel` or `netlify`;
- `providers.mail`: `hostinger-mail` or `backend`.

`providers.designSystem` remains a required build capability. Provider IDs and project references are metadata; credentials are environment contracts.

The Zod parser normalizes legacy provider-named manifests. The public JSON Schema describes the canonical version 2 format written by every new scaffold.

## Implementation Status

| Capability | Implementation |
|---|---|
| Provider catalog | Capability descriptors, required environment, and common DNS contract |
| Manifest | Version 2 discriminated provider slots plus legacy read normalization |
| DNS | Conflict-safe Hostinger and DNS-only Cloudflare CNAME adapters |
| Backend | Provider-neutral React boundary with Supabase and Firebase implementations |
| Backend policy | Supabase migrations/RLS/SQL tests or Firebase Firestore/Storage rules |
| Deployment | Provider-specific Vercel and Netlify GitHub Actions templates |
| Scaffold | Full DNS × backend × deployment selection matrix |
| Doctor | Selected CLI and authentication profile checks |
| Inventory | Vercel, Netlify, Supabase, Firebase, Hostinger, and Cloudflare state |
| Release gate | Provider-specific DNS, backend-policy, secret, design-system, and workflow checks |
| Registry | Atomic local JSON plus owner-scoped remote registry |

## Backend Rules

### Supabase

Every exposed table enables RLS in its creating migration. Policies name target roles, constrain ownership, and include both `USING` and `WITH CHECK` for updates. Data API grants are explicit. Storage is private and paths begin with the authenticated user ID. SQL tests cover anonymous, owner, and cross-user behavior.

The browser receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Service-role and management credentials remain server-side.

### Firebase

The browser backend adapter uses Firebase Auth, Firestore, and Cloud Storage. `firestore.rules` requires `owner_id == request.auth.uid` for creates and existing/new ownership for updates. `storage.rules` constrains the first attachment path segment to the authenticated user ID.

Firebase web configuration is publishable. Admin SDK credentials, service-account JSON, and deployment tokens are never browser variables or manifest values.

## DNS Rules

Both DNS adapters normalize hostnames, use the deployment adapter's CNAME target, and refuse to overwrite `A`, `AAAA`, `ALIAS`, or other conflicting records.

Hostinger validates the proposed record before updating its zone. Cloudflare uses a zone-scoped API token and always writes `proxied: false`; direct Vercel and Netlify routes are not silently placed behind the Cloudflare proxy.

## Deployment Rules

The Vercel workflow pins CLI `56.3.1`, pulls production settings, builds once, deploys the prebuilt artifact, and assigns the custom domain. Required secrets are `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

The Netlify workflow pins CLI `26.2.0`, builds once with the selected backend's public variables supplied by GitHub, assigns the custom domain through the site API, deploys `dist` with `--no-build`, and publishes the returned URL. Required deployment secrets are `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`; the selected backend's `VITE_*` values are also configured in the GitHub production environment.

Both workflows use frozen lockfile installs, cancel superseded runs, keep credentials step-scoped, and upload `deployment.json`.

## Release Gate

`vscd check` fails when the manifest, one lockfile, environment contract, Strawn package wiring, or selected release workflow is missing. It also fails on:

- an incomplete DNS configuration or proxied Cloudflare route;
- a browser-prefixed admin, DNS, mail, or deployment secret;
- missing Supabase RLS or SQL tests;
- missing owner-scoped Firebase rules or `firebase.json`;
- a workflow that does not match the selected deployment provider;
- an old `@paul/*` dependency, private clone/pin wiring, or a prohibited UI-library bypass.

Product lint, tests, typecheck, build, and provider policy tests remain separate required evidence.

## Failure And Recovery

- DNS updates are idempotent and leave the provider deployment URL usable when custom-domain work fails.
- Provider metadata is recorded only after the provider reports success.
- A failed deployment does not mutate the already provisioned CNAME.
- Backend migrations or rule deployments precede production promotion.
- Switching an adapter is a manifest and generated-provider change reviewed as one unit; editing only a workflow or import is invalid.

See [Provider architecture](provider-architecture.md) for the adapter extension checklist.
