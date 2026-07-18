# VSCD

VSCD is a provider-composable control plane for small standalone applications. Its basic stack is **Hostinger DNS + Supabase + Vercel**, but each capability is selected independently in `vscd.json`.

| Capability | Built-in adapters |
|---|---|
| DNS | Hostinger, Cloudflare |
| Backend | Supabase, Firebase |
| Deployment | Vercel, Netlify |
| Authentication email | Hostinger Mail, backend-managed |

Paul's design system remains a required build input. Its source is repository-relative, with `DESIGN_SYSTEM_SOURCE` as a local override and a pinned private clone for remote builds.

## Commands

```powershell
pnpm install
pnpm vscd providers
pnpm vscd doctor
pnpm vscd auth hostinger
pnpm vscd auth cloudflare
pnpm vscd inventory --json

# Basic stack
pnpm vscd init my-project --target ..\my-project

# Alternative stack
pnpm vscd init my-project `
  --target ..\my-project `
  --dns-provider cloudflare `
  --backend-provider firebase `
  --deployment-provider netlify

pnpm vscd dns ..\my-project
pnpm vscd check ..\my-project
pnpm dev:console
```

`providers` lists the installed adapters and their environment contracts. `doctor` checks the CLIs and authentication required by the selected profile. `init` writes a version 2 manifest, keeps only the selected backend and deployment files, and provisions DNS unless `--no-domain` is passed. `dns` reads the selected DNS and deployment adapters from the project manifest. `check` runs backend-, DNS-, and deployment-specific release gates.

Production releases run through a pull request and the generated GitHub Actions workflow. Vercel builds use a pinned prebuilt deployment; Netlify builds deploy the same verified `dist` artifact. Both workflows publish `deployment.json` for registry handoff.

Legacy provider-named manifests are normalized on read into the capability-slot format. Cloudflare is no longer legacy-only: it can be selected at scaffold time, authenticated through the CLI, provisioned through the common DNS contract, and checked as a first-class adapter.

See [Provider architecture](docs/provider-architecture.md), [Architecture](docs/architecture.md), and [Technical design](docs/technical-design.md).

