# VSCD

VSCD is a reusable side-project control plane for Vercel, Supabase, Cloudflare DNS, and the design system in `C:\Users\loqpm\Documents\UI`.

## Commands

```powershell
pnpm install
pnpm vscd doctor
pnpm vscd inventory --json
pnpm vscd init my-project --target C:\Users\loqpm\Documents\my-project
pnpm vscd check C:\Users\loqpm\Documents\my-project
pnpm dev:console
```

`doctor` checks local CLIs and provider authentication without printing secrets. `init` creates a standalone CRUD project with Supabase Auth, RLS, Storage, Vercel CI/CD, Cloudflare DNS automation, and the local design tokens. `check` blocks releases that omit RLS, policy tests, a lockfile, a VSCD manifest, or a GitHub workflow.

Production releases run through a pull request and GitHub Actions. The workflow builds once, deploys the prebuilt artifact to Vercel, creates a DNS-only Cloudflare record when a custom domain is configured, and publishes the resulting URL as a workflow artifact.

See [Architecture](docs/architecture.md) and [Technical design](docs/technical-design.md).

