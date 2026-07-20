# VSCD Architecture

## Decision

VSCD manages each product as a separate repository and provider unit. The manifest selects adapters by capability: DNS, deployment, backend, and mail. Hostinger + Supabase + Vercel remains the basic profile, while Cloudflare + Firebase + Netlify is an equally valid built-in profile. The choices can be mixed independently.

Local builds resolve Paul's design system from the repository-relative manifest source or `DESIGN_SYSTEM_SOURCE`. Remote builds clone the pinned commit into `.vercel-design-system`.

## System Map

```mermaid
flowchart LR
    U["User browser"] --> DNS["DNS adapter\nHostinger or Cloudflare"]
    DNS --> DEP["Deployment adapter\nVercel or Netlify"]
    DEP --> APP["Vite application\nprovider-neutral UI"]
    APP --> BE["Backend adapter\nSupabase or Firebase"]
    BE --> AUTH["Identity + authorization"]
    BE --> DATA["Records + object storage"]

    DS["Paul design system"] -. "pinned build input" .-> APP
    CDX["Codex + vscd-build"] --> CLI["VSCD CLI"]
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
| Deployment provider | Static app and optional serverless endpoints | Vercel or Netlify credentials in GitHub Actions |
| DNS provider | Authoritative CNAME | Hostinger or Cloudflare token in the control plane |
| GitHub Actions | Verified production build and selected deployment workflow | Selected adapter secrets and design-system deploy key |
| Codex/VSCD | Scaffold, check, inventory, registration, URL handoff | Local authenticated CLI sessions; no logged secret values |

## Build Sequence

```mermaid
sequenceDiagram
    actor User
    participant Codex
    participant VSCD as VSCD CLI
    participant DNS as DNS adapter
    participant Backend as Backend adapter
    participant GitHub
    participant Deploy as Deployment adapter

    User->>Codex: Build me X with selected providers
    Codex->>VSCD: doctor --provider profile
    VSCD-->>Codex: selected adapter readiness
    Codex->>VSCD: init x --dns-provider ... --backend-provider ... --deployment-provider ...
    VSCD->>DNS: conflict-safe CNAME upsert
    VSCD-->>Codex: app + selected provider files + workflow
    Codex->>VSCD: check x
    VSCD-->>Codex: provider-specific policy and release gates
    Codex->>GitHub: feature branch + pull request
    GitHub->>Backend: run provider policy tests
    GitHub->>Deploy: deploy verified artifact and assign hostname
    Deploy-->>GitHub: deployment URL
    GitHub-->>VSCD: deployment artifact
    VSCD-->>User: verified project URLs
```

## Repository Boundaries

```text
VSCD repository
  apps/console        public product site and server-side web functions
  packages/core       manifest normalization, catalog, contracts, API clients
  packages/cli        doctor, inventory, scaffold, DNS, checks, registry
  templates/crud-app  base app plus provider-specific adapters/workflows
  supabase/            control-plane registry schema and policy tests
  docs/                public architecture and extension contract

Generated project
  src/lib/backend.ts  selected backend boundary
  supabase/ or *.rules selected backend authorization artifacts
  scripts/             manifest-driven DNS and build preparation
  .github/workflows/   selected deployment adapter
  vscd.json            capability selections, safe metadata, URLs
```

## Security Invariants

- DNS adapters reject conflicting record types. Cloudflare routes remain DNS-only.
- Supabase tables in exposed schemas enable RLS, grant Data API access explicitly, and ship SQL policy tests.
- Firebase documents and objects require matching authenticated ownership in committed rules.
- Browser variables may contain publishable provider configuration, never service-role/admin, DNS, mail, deployment, or deploy-key secrets.
- Production deployment runs only through the generated provider workflow after local and VSCD checks.

See [Provider architecture](provider-architecture.md) for the extension protocol.

