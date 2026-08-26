# Ribbon

Ribbon is a provider-composable control plane for scaffolding, verifying, and releasing small standalone applications. A versioned `ribbon.json` selects DNS, backend, deployment, mail, and design-system capabilities without coupling application code to one infrastructure vendor.

![One flowing Ribbon connecting email, DNS, frontend, and database capabilities](apps/console/public/images/ribbon-switchboard.webp)

## Status

| Surface | Location | Purpose |
|---|---|---|
| Local site | [localhost:4310](http://localhost:4310) | Product explanation and framework overview |
| Source | This repository | CLI, contracts, public site, templates, tests, and release automation |

Ribbon is currently distributed as source. The former hosted product site is
not part of the availability contract; use the local console and repository
documentation as the supported entry points.

## Quick start

Requirements: Node.js 24, pnpm 11.7.0, Git, and the CLIs required by the selected providers.

```powershell
pnpm install --frozen-lockfile
pnpm ribbon providers
pnpm ribbon doctor
pnpm dev:console
```

The public site runs at `http://localhost:4310/`.

Create and validate an application:

```powershell
pnpm ribbon init notes-app --target ../notes-app
pnpm ribbon check ../notes-app
```

Select a different provider for any capability:

```powershell
pnpm ribbon init notes-app `
  --target ../notes-app `
  --dns-provider cloudflare `
  --backend-provider firebase `
  --deployment-provider netlify `
  --mail-provider backend
```

Create the Firebase-only, no-billing starter:

```powershell
pnpm ribbon doctor --backend-provider firebase --deployment-provider firebase-hosting
pnpm ribbon init notes-app `
  --target ../notes-app `
  --backend-provider firebase `
  --deployment-provider firebase-hosting `
  --mail-provider backend `
  --no-domain
pnpm ribbon check ../notes-app
```

That profile uses Firebase Hosting's `PROJECT_ID.web.app` hostname, Firebase Authentication email links, and one owner-scoped Firestore database. It does not require Hostinger, Cloudflare, Vercel, Netlify, Supabase, SQL Connect, or Cloud Storage. Add `--firebase-storage cloud-storage` only when you deliberately want attachments: since February 3, 2026, Cloud Storage for Firebase requires the Blaze pay-as-you-go plan, although no-cost usage quotas may still apply.

## Mental model

```mermaid
flowchart LR
  A["Intent"] --> M["ribbon.json"]
  M --> C["Ribbon CLI"]
  C --> DNS["DNS adapter"]
  C --> BE["Backend adapter"]
  C --> DEP["Deployment adapter"]
  C --> MAIL["Mail adapter"]
  DS["Strawn packages from npm"] -. "build input" .-> APP["Generated application"]
  BE --> APP
  APP --> DEP
  DNS --> DEP
  MAIL --> APP
```

The manifest is the source of truth. The CLI reads it, resolves one adapter per capability, generates only the selected provider files, and applies provider-specific checks before release.

## Provider matrix

| Capability | Default | Alternative | Contract |
|---|---|---|---|
| DNS | Hostinger | Cloudflare | Conflict-safe CNAME provisioning; Cloudflare stays DNS-only |
| Backend | Supabase | Firebase Auth + Firestore | Authenticated ownership for records; Cloud Storage is an explicit Blaze option |
| Deployment | Vercel | Netlify or Firebase Hosting | Verified prebuilt artifact released by GitHub Actions |
| Mail | Hostinger Mail | Backend-managed | Server-only delivery or selected backend auth flow |
| Design system | Strawn | None | Exact npm package versions locked by pnpm |

Provider IDs and required environment names are defined in [`packages/core/src/providers/contracts.ts`](packages/core/src/providers/contracts.ts).

## Manifest contract

Every managed repository contains a manifest version 2 file:

```json
{
  "$schema": "./schemas/ribbon.schema.json",
  "manifestVersion": 2,
  "name": "Notes app",
  "slug": "notes-app",
  "framework": "vite-react",
  "projectType": "application",
  "providers": {
    "dns": { "provider": "hostinger", "domain": "example.com", "hostname": "notes.example.com" },
    "backend": { "provider": "supabase" },
    "deployment": { "provider": "vercel", "cnameTarget": "cname.vercel-dns.com" },
    "mail": { "provider": "hostinger-mail" },
    "designSystem": {
      "provider": "strawn",
      "source": "npm",
      "version": "0.1.0",
      "packages": ["strawn", "strawn-icons"],
      "requiredComponents": ["ThemeProvider", "TooltipProvider"]
    }
  }
}
```

Rules:

- `projectType: "control-plane"` is reserved for this repository.
- Generated repositories use `projectType: "application"`.
- Provider choices are independent capability slots.
- Strawn is installed from npm at the exact version declared in the manifest and package file.
- The lockfile pins the resolved package artifacts for local and remote builds.
- Secret values never belong in `ribbon.json`, source, documentation, or browser variables.

The complete schema is [`schemas/ribbon.schema.json`](schemas/ribbon.schema.json).

## Command registry

| Command | Mutates state | Purpose |
|---|---:|---|
| `pnpm ribbon providers` | No | List built-in adapters and environment contracts |
| `pnpm ribbon doctor` | No | Check local tools and selected-provider authentication |
| `pnpm ribbon inventory --json` | No | Return machine-readable registered project inventory |
| `pnpm ribbon auth <provider>` | Yes | Store supported provider credentials outside the repository |
| `pnpm ribbon init <slug> --target <path>` | Yes | Scaffold a version 2 application |
| `pnpm ribbon dns <project-path>` | Yes | Provision the manifest-selected CNAME without replacing conflicts |
| `pnpm ribbon check <project-path>` | No | Run provider, design-system, security, and release gates |
| `pnpm dev:console` | No | Start the public site locally |
| `pnpm check` | No | Run the complete workspace quality gate |
| `pnpm codex:check` | No | Validate this repository as the Ribbon control plane |

Use `pnpm ribbon <command> --help` for command options.

## Repository layout

```text
.
├── apps/console/               public site and Vercel functions
│   ├── public/images/          repository-owned public media
│   └── src/features/           public landing-page composition
├── packages/core/              manifest schema, normalization, registry, provider contracts
├── packages/cli/               doctor, scaffold, DNS, inventory, checks, and registration
├── templates/boilerplate/      provider-neutral application boilerplate and provider files
├── schemas/                    JSON schema for ribbon.json
├── supabase/                   registry migrations and RLS tests
├── docs/                       architecture and provider extension documentation
├── scripts/                    build preparation scripts
├── AGENTS.md                   binding agent contract
└── ribbon.json                   this control plane's manifest
```

Detailed design documents:

- [Architecture](docs/architecture.md)
- [Provider architecture](docs/provider-architecture.md)
- [Technical design](docs/technical-design.md)

## Design-system resolution

The public site and generated applications import the public `strawn` and `strawn-icons` package roots. Both packages are fetched from npm, pinned at `0.1.0`, and locked by `pnpm-lock.yaml`. There is no local checkout override, private clone, deploy key, or machine-specific source path.

## Environment contract

Copy [`.env.example`](.env.example) to an ignored local environment file and populate only the providers you use.

| Boundary | Names |
|---|---|
| Browser-safe Supabase client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Supabase management | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_SLUG`, `SUPABASE_PROJECT_REF` |
| Hostinger DNS control plane | `HOSTINGER_API_TOKEN`, `HOSTINGER_DOMAIN` |
| Cloudflare DNS control plane | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` |
| Vercel release | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Netlify release | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` |
| Firebase Hosting release | `FIREBASE_PROJECT_ID` variable, `FIREBASE_SERVICE_ACCOUNT_JSON` secret |
| Firebase browser configuration | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` |
| Optional Firebase Cloud Storage | `VITE_FIREBASE_STORAGE_BUCKET` (Blaze plan required) |

Admin, DNS, deployment, mail, and private-repository credentials are server-only. They must never use the `VITE_` prefix. The public control-plane manifest selects provider types without binding the repository to a private Supabase project, Vercel project, or Vercel organization.

### Agent-assisted provider setup

Agents may set up providers through their CLIs, but a local CLI login is not a substitute for CI credentials. The account owner must approve browser-based sign-in or enter a token directly into a secure terminal prompt; do not paste credentials into chat, source files, the manifest, or documentation.

1. Authenticate GitHub with `gh auth login` so the agent can manage repository configuration.
2. Authenticate Vercel locally with `vercel login`, approve its device-login request, and link the project. For the GitHub Actions release, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions secrets. The workflow runs on a separate runner and cannot use the local Vercel login.
3. Authenticate the Supabase CLI with `supabase login`; it securely stores the management access token locally. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as deployment variables for browser code. Keep any privileged server key only in the deployment provider's server-side secret store. The current release workflow does not require Supabase management credentials.
4. Create a Hostinger API token in the Hostinger account and provide it only through a secure terminal prompt or local ignored environment file, together with `HOSTINGER_DOMAIN`. Use it for explicit DNS provisioning. The current release workflow does not use Hostinger credentials.

When an agent needs to add a GitHub Actions secret, it should use `gh secret set <NAME>` and let the account owner enter the value at the prompt. Agents must not echo, save, or inspect the value.

## Verification

Run the narrowest relevant check while editing, then run the full gate:

```powershell
pnpm --filter @moriatz/ribbon-console typecheck
pnpm --filter @moriatz/ribbon-console build
pnpm --filter @moriatz/ribbon-cli test
pnpm --filter @moriatz/ribbon-core test
pnpm check
pnpm codex:check
```

UI changes additionally require browser checks at 375, 768, 1440, and 1920 pixels, no console errors, no horizontal overflow, keyboard-visible focus, and a reduced-motion path.

## Release

Production release is automatic after a reviewed merge to `main`:

1. Create a feature branch.
2. Commit only the requested scope.
3. Push and open a pull request.
4. Wait for `CI` to pass.
5. Merge the reviewed pull request.
6. Let the `CI` workflow rerun its gates and deploy the verified artifact from `main`.
7. Verify the Vercel deployment, `ribbon.moriatz.com`, DNS, TLS, and public-site browser behavior.

Local production deployment is forbidden. The deploy job runs only on pushes to `main`, after workspace and Supabase RLS gates pass, then builds once and deploys the verified prebuilt artifact.

## Agent contract

Agents must read [`AGENTS.md`](AGENTS.md) before changing this repository. It defines authority, discovery order, provider invariants, relative-path rules, verification requirements, and the release boundary.

## License

Source code is MIT licensed. Moriatz/Ribbon brand assets and media are excluded.
See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
