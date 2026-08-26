# Provider Architecture

## Default Is A Profile, Not An Assumption

Ribbon's basic profile is Hostinger DNS, Supabase, Vercel, and Hostinger Mail. The implementation does not infer those providers from filenames. A version 2 manifest selects one adapter for each capability:

```json
{
  "manifestVersion": 2,
  "providers": {
    "dns": {
      "provider": "cloudflare",
      "zoneId": "zone-id",
      "domain": "example.com",
      "hostname": "notes.example.com",
      "ttl": 300,
      "proxied": false
    },
    "backend": {
      "provider": "firebase",
      "projectId": "notes-production"
    },
    "deployment": {
      "provider": "netlify",
      "siteName": "notes",
      "cnameTarget": "notes.netlify.app"
    },
    "mail": {
      "provider": "backend"
    }
  }
}
```

Provider names, public hostnames, regions, and routing targets are safe to commit. Optional instance identifiers such as Supabase project refs and Vercel project or organization IDs are omitted from the public Ribbon manifest and supplied through server-side environment variables when an operation needs them. Tokens, private keys, service-role credentials, and deployment credentials are named by the adapter contract but never stored in the manifest.

## Capability Boundaries

| Capability | Common contract | Provider-owned behavior |
|---|---|---|
| DNS | Conflict-safe `upsertCname`, normalized result | API URL, zone representation, record update semantics |
| Backend | Session, magic link, CRUD, attachment storage | SDK, schema/rules, authorization tests |
| Deployment | Build verified artifact, deploy, assign domain, emit URL | CLI/API commands and provider identifiers |
| Mail | Deliver authentication and transactional email | Hostinger server route or backend-managed email |

The generated React UI imports `src/lib/backend.ts`. That module selects a provider adapter, so product components do not know whether data comes from Supabase or Firebase.

DNS is manifest-driven in both the Ribbon CLI and generated `scripts/configure-domain.mjs`. The CNAME target comes from the selected deployment adapter rather than assuming Vercel. Cloudflare is always configured with `proxied: false` for these direct hosting-provider routes.

Deployment workflows are adapter templates. Scaffolding copies only the selected Vercel, Netlify, or Firebase Hosting workflow into the generated repository and removes the unused provider files.

## Built-In Adapters

### DNS

- `hostinger`: validates the proposed zone fragment, refuses conflicting record types, and updates the matching CNAME.
- `cloudflare`: uses a zone-scoped token, refuses conflicting record types, and creates or patches a DNS-only CNAME.

### Backend

- `supabase`: Supabase Auth, Postgres CRUD, private Storage, RLS migrations, explicit Data API grants, and SQL policy tests.
- `firebase`: Firebase Auth email links and Firestore CRUD with owner-scoped rules. Cloud Storage and its owner-scoped rules are available only through the explicit `cloud-storage` option.

### Deployment

- `vercel`: pulls project settings, builds once, deploys the prebuilt output, and assigns the custom domain.
- `netlify`: builds once, assigns the custom domain through the site API, and deploys `dist` through the pinned CLI.
- `firebase-hosting`: builds once, deploys `dist` and the selected Firebase rules through the pinned Firebase CLI, and returns the default `PROJECT_ID.web.app` URL. External DNS is optional.

## Validation-only GitExplore profile

Ribbon also recognizes one additive application contract with `framework: react-vite-rust-services`. It exists to validate the independently maintained GitExplore repository; it is not an `init`, `doctor`, provisioning, or generic generation target.

The profile is deliberately closed over these slots:

- Vercel deployment with `mode: services`, an inspected-or-pending project CNAME contract, a Vite/React `web` service, and a Rust container `api` service on the same browser origin;
- `rust-axum` backend metadata, including explicit identity-store and refresh-coordination production readiness;
- `neo4j-aura` graph schema and migration-gate metadata;
- `github-oauth` callback metadata and server runtime environment variable names, never values; the same-origin browser contract exposes no API-base environment variable;
- public npm dependencies pinned to `strawn@0.2.0` and `strawn-icons@0.1.1`, with imports from their public roots;
- a consistent `productionReadiness` declaration enforced by the main release workflow.

`ribbon check` verifies the profile's `Dockerfile.vercel`, ordered top-level API routes followed by one plain `{ service: "web" }` catch-all, a service-local `services.web.rewrites` SPA fallback from `/(.*)` to `/index.html`, idempotent Neo4j constraints, React entry point, same-origin API factory, exact Strawn package and lockfile pins, serialized build-once release, and fail-closed readiness gate. The top-level web destination may not carry `destination.path`, request-path transforms, or explicit `/login` and `/app/*` rules; the static Vite service owns all browser-route fallback behavior. Stale Svelte adapters, private web-to-API bindings, repository-pin token snapshots, and browser API-origin variables are also rejected. Catalog entries marked `validationOnly` are intentionally rejected by scaffold and doctor provider selection.

## Firebase-only Spark profile

The lowest-dependency profile combines `backend: firebase` with `storage: none`, `deployment: firebase-hosting`, backend-managed authentication email, and no DNS provider. It uses Firebase Authentication, Cloud Firestore, and Firebase Hosting without SQL Connect.

Cloud Storage is not part of the Spark profile. Firebase requires Blaze billing for Cloud Storage projects as of February 3, 2026. Selecting `--firebase-storage cloud-storage` keeps attachment support and Storage rules but deliberately changes the billing prerequisite.

## Adding Another Adapter

Adding a provider is deliberately bounded:

1. Add its descriptor and environment contract to `packages/core/src/providers/contracts.ts`.
2. Add its discriminated manifest configuration and JSON Schema branch.
3. Implement the capability contract. DNS providers implement `DnsProviderAdapter`; backend providers implement the generated `BackendAdapter`; deployment providers supply a release template.
4. Teach the scaffold to keep the provider's files and remove unused alternatives.
5. Add provider-specific `doctor`, inventory, and `ribbon check` evidence.
6. Add the provider to the full scaffold matrix and build a generated reference project.
7. Document credential scope, conflict behavior, rollback, and production evidence.

An adapter is not complete merely because the manifest accepts its name. It must scaffold, check, build, and release through the same lifecycle as the existing providers.

The GitExplore validation profile does not weaken this rule: it describes and checks an existing product but does not claim adapter completeness or scaffold support.

## Legacy Manifests

Version 1 manifests keyed provider configuration directly as `providers.vercel`, `providers.supabase`, `providers.hostinger`, or `providers.cloudflare`. The core parser normalizes those files to version 2 capability slots when reading or registering them. New scaffolds always write version 2.

The old Cloudflare behavior was therefore “legacy support”: a low-level client and an optional manifest block existed, but scaffold, DNS CLI, checks, console, and release were still Hostinger/Vercel-specific. Version 2 makes Cloudflare a complete selectable DNS adapter.
