# VSCD Agent Contract

VSCD is the only product name. It coordinates capability-selected DNS, backend, deployment, and mail adapters plus the design system referenced by each project's repository-relative `providers.designSystem.source`. The basic stack is Hostinger DNS, Supabase, and Vercel; Cloudflare, Firebase, and Netlify are first-class alternatives. Set `DESIGN_SYSTEM_SOURCE` when the local checkout is not at the manifest path.

Paul's design system is mandatory in every generated frontend. The template and `vscd check` must require public `@paul/*` imports, root tokens/provider wiring, a pinned private-repository commit, remote-build credentials, and `DatePicker` from `@paul/ui-patterns` for every date field. Never generate Tailwind, shadcn/ui, Lucide, direct Radix imports, a native application-level `input[type=date]`, or a local replacement for an available design-system component.

The private clone is a build dependency, not application source. Every generated Vitest configuration must extend `configDefaults.exclude` with `.vercel-design-system/**`; never allow a product test run to discover tests inside the cloned design-system repository.

Only this repository's root manifest may use `projectType: "control-plane"`. The CRUD template must emit `projectType: "application"`; changing a generated app to the control-plane type to skip application checks is invalid.

## Required workflow

1. Run `pnpm vscd doctor` before provisioning or linking providers.
2. Run `pnpm vscd check <project-path>` before opening a pull request and resolve every design-system failure without weakening the checks.
3. Provision CNAMEs through the DNS adapter selected in `providers.dns`; neither Hostinger nor Cloudflare may replace conflicting record types automatically, and Cloudflare CNAMEs remain DNS-only.
4. Apply the selected backend's authorization boundary: RLS and SQL tests for Supabase, owner-scoped Firestore and Storage rules for Firebase.
5. Use the selected mail capability. Hostinger Mail link generation, rate limiting, and delivery stay server-side; backend-managed email uses the selected backend's authenticated client flow.
6. Never expose backend admin credentials, DNS/mail tokens, or deployment tokens to browser code.
7. Keep the machine-level `VERCEL_TOKEN` user environment variable populated for VSCD release work, and propagate it into each generated repository's GitHub Actions secret store as `VERCEL_TOKEN` rather than copying token literals into files.
8. Release production through the selected Vercel or Netlify GitHub Actions adapter. Do not deploy production from a local agent session.
9. Register provider IDs and resulting URLs in the VSCD registry after a successful release.

## Trigger phrases

Requests such as "build me X", "scaffold a CRUD app", "deploy this side project", or "give me the project URLs" should use the global `vscd-build` skill and this repository's CLI.

