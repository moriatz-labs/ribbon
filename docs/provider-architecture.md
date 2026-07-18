# Provider Architecture

## Default Is A Profile, Not An Assumption

VSCD's basic profile is Hostinger DNS, Supabase, Vercel, and Hostinger Mail. The implementation does not infer those providers from filenames. A version 2 manifest selects one adapter for each capability:

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

Provider metadata is safe to commit. Tokens, private keys, service-role credentials, and deployment credentials are named by the adapter contract but never stored in the manifest.

## Capability Boundaries

| Capability | Common contract | Provider-owned behavior |
|---|---|---|
| DNS | Conflict-safe `upsertCname`, normalized result | API URL, zone representation, record update semantics |
| Backend | Session, magic link, CRUD, attachment storage | SDK, schema/rules, authorization tests |
| Deployment | Build verified artifact, deploy, assign domain, emit URL | CLI/API commands and provider identifiers |
| Mail | Deliver authentication and transactional email | Hostinger server route or backend-managed email |

The generated React UI imports `src/lib/backend.ts`. That module selects a provider adapter, so product components do not know whether data comes from Supabase or Firebase.

DNS is manifest-driven in both the VSCD CLI and generated `scripts/configure-domain.mjs`. The CNAME target comes from the selected deployment adapter rather than assuming Vercel. Cloudflare is always configured with `proxied: false` for these direct hosting-provider routes.

Deployment workflows are adapter templates. Scaffolding copies only `release-vercel.yml` or `release-netlify.yml` into the generated repository and removes the unused provider files.

## Built-In Adapters

### DNS

- `hostinger`: validates the proposed zone fragment, refuses conflicting record types, and updates the matching CNAME.
- `cloudflare`: uses a zone-scoped token, refuses conflicting record types, and creates or patches a DNS-only CNAME.

### Backend

- `supabase`: Supabase Auth, Postgres CRUD, private Storage, RLS migrations, explicit Data API grants, and SQL policy tests.
- `firebase`: Firebase Auth email links, Firestore CRUD, Cloud Storage, and owner-scoped Firestore/Storage rules.

### Deployment

- `vercel`: pulls project settings, builds once, deploys the prebuilt output, and assigns the custom domain.
- `netlify`: builds once, assigns the custom domain through the site API, and deploys `dist` through the pinned CLI.

## Adding Another Adapter

Adding a provider is deliberately bounded:

1. Add its descriptor and environment contract to `packages/core/src/providers/contracts.ts`.
2. Add its discriminated manifest configuration and JSON Schema branch.
3. Implement the capability contract. DNS providers implement `DnsProviderAdapter`; backend providers implement the generated `BackendAdapter`; deployment providers supply a release template.
4. Teach the scaffold to keep the provider's files and remove unused alternatives.
5. Add provider-specific `doctor`, inventory, and `vscd check` evidence.
6. Add the provider to the full scaffold matrix and build a generated reference project.
7. Document credential scope, conflict behavior, rollback, and production evidence.

An adapter is not complete merely because the manifest accepts its name. It must scaffold, check, build, and release through the same lifecycle as the existing providers.

## Legacy Manifests

Version 1 manifests keyed provider configuration directly as `providers.vercel`, `providers.supabase`, `providers.hostinger`, or `providers.cloudflare`. The core parser normalizes those files to version 2 capability slots when reading or registering them. New scaffolds always write version 2.

The old Cloudflare behavior was therefore “legacy support”: a low-level client and an optional manifest block existed, but scaffold, DNS CLI, checks, console, and release were still Hostinger/Vercel-specific. Version 2 makes Cloudflare a complete selectable DNS adapter.

