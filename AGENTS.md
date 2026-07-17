# VSCD Agent Contract

VSCD is the only product name. It coordinates Vercel, Supabase, Hostinger DNS, and the design system in `C:\Users\loqpm\Desktop\Paul\design-system`.

Paul's design system is mandatory in every generated frontend. The template and `vscd check` must require public `@paul/*` imports, root tokens/provider wiring, a pinned private-repository commit, remote-build credentials, and `DatePicker` from `@paul/ui-patterns` for every date field. Never generate Tailwind, shadcn/ui, Lucide, direct Radix imports, a native application-level `input[type=date]`, or a local replacement for an available design-system component.

The private clone is a build dependency, not application source. Every generated Vitest configuration must extend `configDefaults.exclude` with `.vercel-design-system/**`; never allow a product test run to discover tests inside the cloned design-system repository.

## Required workflow

1. Run `pnpm vscd doctor` before provisioning or linking providers.
2. Run `pnpm vscd check <project-path>` before opening a pull request and resolve every design-system failure without weakening the checks.
3. Provision Vercel-bound Hostinger CNAMEs through `vscd init` or `vscd dns`; never replace conflicting record types automatically.
4. Enable RLS on every table in an exposed Supabase schema and test anonymous, owner, and cross-user behavior.
5. Use Hostinger Mail for generated-app magic links and transactional email when its three mail settings are present; keep link generation, rate limiting, and mailbox sends server-side.
6. Never expose Supabase secret/service-role, Hostinger DNS/mail, Vercel, or Cloudflare tokens to browser code.
7. Release production through a feature branch, pull request, and GitHub Actions. Do not deploy production from a local agent session.
8. Register provider IDs and resulting URLs in the VSCD registry after a successful release.

## Trigger phrases

Requests such as "build me X", "scaffold a CRUD app", "deploy this side project", or "give me the project URLs" should use the global `vscd-build` skill and this repository's CLI.

