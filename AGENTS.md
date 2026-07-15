# VSCD Agent Contract

VSCD is the only product name. It coordinates Vercel, Supabase, Cloudflare DNS, and the design system in `C:\Users\loqpm\Documents\UI`.

## Required workflow

1. Run `pnpm vscd doctor` before provisioning or linking providers.
2. Run `pnpm vscd check <project-path>` before opening a pull request.
3. Keep Vercel-bound Cloudflare records DNS-only (`proxied: false`).
4. Enable RLS on every table in an exposed Supabase schema and test anonymous, owner, and cross-user behavior.
5. Never expose a Supabase secret/service-role key or Cloudflare token to browser code.
6. Release production through a feature branch, pull request, and GitHub Actions. Do not deploy production from a local agent session.
7. Register provider IDs and resulting URLs in the VSCD registry after a successful release.

## Trigger phrases

Requests such as "build me X", "scaffold a CRUD app", "deploy this side project", or "give me the project URLs" should use the global `vscd-build` skill and this repository's CLI.

