# Ribbon Architecture

## Decision

Ribbon manages each product as a separate repository and provider unit. The manifest selects adapters by capability: DNS, deployment, backend, and mail. Hostinger + Supabase + Vercel remains the basic profile, while Cloudflare + Firebase + Netlify is an equally valid built-in profile. The choices can be mixed independently.

Local and remote builds resolve Strawn from the exact npm package versions in `package.json` and the pnpm lockfile.

## System Map

```mermaid
flowchart LR
    U["User browser"] --> DNS["DNS adapter\nHostinger or Cloudflare"]
    DNS --> DEP["Deployment adapter\nVercel, Netlify, or Firebase Hosting"]
    DEP --> APP["Vite application\nprovider-neutral UI"]
    APP --> BE["Backend adapter\nSupabase or Firebase"]
    BE --> AUTH["Identity + authorization"]
    BE --> DATA["Records + object storage"]

    DS["Strawn npm packages"] -. "pinned build input" .-> APP
    CDX["Codex + ribbon-build"] --> CLI["Ribbon CLI"]
    CLI --> CATALOG["Provider catalog + contracts"]
    CATALOG --> DNS
    CATALOG --> DEP
    CATALOG --> BE
```

## Control And Runtime Planes

| Plane | Responsibility | Credentials |
|---|---|---|
| Browser | UI, user session, provider-neutral backend calls | Publishable Firebase or Supabase configuration |
| Backend provider | Identity, record authorization, object access | User identity at runtime; admin credentials only for trusted operations |
| Deployment provider | Static app and optional serverless endpoints | Selected provider credentials in GitHub Actions |
| DNS provider | Authoritative CNAME | Hostinger or Cloudflare token in the control plane |
| GitHub Actions | Verified production build and selected deployment workflow | Selected adapter secrets and design-system deploy key |
| Codex/Ribbon | Scaffold, check, inventory, registration, URL handoff | Local authenticated CLI sessions; no logged secret values |

## Build Sequence

```mermaid
sequenceDiagram
    actor User
    participant Codex
    participant Ribbon as Ribbon CLI
    participant DNS as DNS adapter
    participant Backend as Backend adapter
    participant GitHub
    participant Deploy as Deployment adapter

    User->>Codex: Build me X with selected providers
    Codex->>Ribbon: doctor --provider profile
    Ribbon-->>Codex: selected adapter readiness
    Codex->>Ribbon: init x --dns-provider ... --backend-provider ... --deployment-provider ...
    Ribbon->>DNS: conflict-safe CNAME upsert
    Ribbon-->>Codex: app + selected provider files + workflow
    Codex->>Ribbon: check x
    Ribbon-->>Codex: provider-specific policy and release gates
    Codex->>GitHub: feature branch + pull request
    GitHub->>Backend: run provider policy tests
    GitHub->>Deploy: deploy verified artifact and assign hostname
    Deploy-->>GitHub: deployment URL
    GitHub-->>Ribbon: deployment artifact
    Ribbon-->>User: verified project URLs
```

## Repository Boundaries

```text
Ribbon repository
  apps/console        public product site and server-side web functions
  packages/core       manifest normalization, catalog, contracts, API clients
  packages/cli        doctor, inventory, scaffold, DNS, checks, registry
  templates/boilerplate  base app plus provider-specific adapters/workflows
  supabase/            control-plane registry schema and policy tests
  docs/                public architecture and extension contract

Generated project
  src/lib/backend.ts  selected backend boundary
  supabase/ or *.rules selected backend authorization artifacts
  scripts/             manifest-driven DNS and build preparation
  .github/workflows/   selected deployment adapter
  ribbon.json            capability selections, safe metadata, URLs
```

## Security Invariants

- DNS adapters reject conflicting record types. Cloudflare routes remain DNS-only.
- Supabase tables in exposed schemas enable RLS, grant Data API access explicitly, and ship SQL policy tests.
- Firebase documents and objects require matching authenticated ownership in committed rules.
- Browser variables may contain publishable provider configuration, never service-role/admin, DNS, mail, deployment, or deploy-key secrets.
- Production deployment runs only through the generated provider workflow after local and Ribbon checks.

See [Provider architecture](provider-architecture.md) for the extension protocol.
