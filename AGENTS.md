---
project: VSCD
scope: repository
manifest: vscd.json
manifest_version: 2
package_manager: pnpm@11.7.0
node: 24
production_release: github-actions-main
---

# VSCD Agent Contract

## 1. Authority

This file is the binding repository contract for agents working in VSCD.

Precedence, highest first:

1. Executable schemas, tests, and public package APIs.
2. This `AGENTS.md`.
3. Accepted architecture documents under `docs/`.
4. `README.md`.

Never weaken an executable check to make a change pass. Fix the implementation or update the contract and tests together when the requested behavior genuinely changes.

## 2. Required discovery order

Before editing:

1. Read `AGENTS.md` completely.
2. Read `vscd.json`.
3. Read the relevant package or app `package.json`.
4. Inspect `git status --short` and preserve unrelated work.
5. Read the nearest implementation, tests, and referenced architecture document.
6. For UI work, read the design-system contract selected by `providers.designSystem`.
7. For provisioning or release work, run `pnpm vscd doctor` before mutation.

Do not scan credentials or print secret values during discovery.

## 3. Product model

VSCD has five manifest-selected capabilities:

| Capability | Built-in provider IDs |
|---|---|
| `dns` | `hostinger`, `cloudflare` |
| `backend` | `supabase`, `firebase` |
| `deployment` | `vercel`, `netlify` |
| `mail` | `hostinger-mail`, `backend` |
| `designSystem` | pinned Paul design system |

Provider selections are independent. Do not infer one capability from another.

The basic profile is Hostinger DNS + Supabase + Vercel + Hostinger Mail. Alternatives are first-class, not legacy fallbacks.

Only the repository-root manifest may use `projectType: "control-plane"`. Generated projects must use `projectType: "application"`.

## 4. Source ownership

| Path | Owns |
|---|---|
| `apps/console/src/App.tsx` | Public-site composition root only |
| `apps/console/src/features/landing/` | Public product site at `/` |
| `apps/console/public/images/` | Public, repository-owned media referenced by web-relative paths |
| `packages/core/` | Manifest types, validation, normalization, registry, provider contracts |
| `packages/cli/` | Commands, orchestration, local credential loading, checks |
| `templates/crud-app/` | Generated application source and provider-specific templates |
| `schemas/vscd.schema.json` | Machine-readable manifest schema |
| `supabase/` | Control-plane registry schema and RLS tests |
| `docs/` | Architecture and extension contracts |

Keep `App.tsx` as a composition root. Put feature UI under `features/<feature>/`. Use `components/`, `constants.ts`, and `types.ts` according to responsibility. Define no more than one React component per file.

## 5. Relative-path contract

All shipped filesystem references must be repository-relative.

- Read the local design-system path from `providers.designSystem.source` in `vscd.json`.
- Use `DESIGN_SYSTEM_SOURCE` only as an explicit machine-local override.
- Never commit a drive-qualified path, home-directory path, `file://` URI, or generated-image cache path.
- Store public media under the owning app's `public/` directory.
- Reference public media with web-relative paths such as `/images/vscd-switchboard.webp`.
- Reference repository documents with relative Markdown links.
- Remote design-system clones belong only in ignored `.vercel-design-system/`.

## 6. Design-system contract

Paul's design system is mandatory for public and generated frontend work.

Required:

- Import primitives from `@paul/ui-core`.
- Import icons from `@paul/ui-icons`.
- Import reusable patterns, including every date field, from `@paul/ui-patterns`.
- Import root tokens from `@paul/ui-tokens/styles.css`.
- Use semantic tokens instead of component-level palette literals.
- Preserve accessible names, keyboard behavior, 44px touch targets, focus visibility, responsive content, and reduced motion.
- Pin remote builds to the exact commit in `.design-system-version` and `providers.designSystem.commit`.

Forbidden:

- App-local replacements for available design-system components.
- Tailwind, shadcn/ui, Lucide, direct Radix imports, or inline SVG icons in newly generated UI.
- Native application-level `input[type="date"]`.
- A second date-picker trigger.
- `transition: all`, scale-from-zero entrances, unbounded animation, or decorative infinite motion.

The authenticated browser console is not currently shipped. New public UI must follow this contract.

## 7. Provider invariants

### DNS

- Resolve the adapter from `providers.dns.provider`.
- Reject conflicting record types. Never replace them automatically.
- Keep Cloudflare CNAMEs DNS-only.
- Provision only the hostname declared by the manifest.

### Backend

- Supabase: enable RLS for exposed tables and ship SQL policy tests.
- Firebase: commit owner-scoped Firestore and Storage rules and their tests.
- Keep the browser behind the provider-neutral backend boundary.

### Deployment

- Resolve the workflow from `providers.deployment.provider`.
- Build once, verify, and deploy the prebuilt artifact.
- Keep production release in GitHub Actions.

### Mail

- Resolve mail independently from backend selection.
- Keep link generation, rate limiting, sender credentials, and delivery server-side.

## 8. Secret boundary

Never read a secret value into logs, source, documentation, generated output, or browser code.

Server-only categories:

- backend admin or service-role keys;
- DNS API tokens;
- mail tokens and mailbox credentials;
- Vercel or Netlify deployment tokens;
- design-system repository tokens and deploy keys.

Only publishable provider configuration may use a `VITE_` prefix. Credential files stay outside the repository or in ignored local environment files.

## 9. Command registry

| Intent | Command |
|---|---|
| List provider contracts | `pnpm vscd providers` |
| Inspect readiness | `pnpm vscd doctor` |
| Scaffold | `pnpm vscd init <slug> --target <path>` |
| Provision DNS | `pnpm vscd dns <project-path>` |
| Validate a managed project | `pnpm vscd check <project-path>` |
| Run public site locally | `pnpm dev:console` |
| Public-site typecheck | `pnpm --filter @vscd/console typecheck` |
| Workspace gate | `pnpm check` |
| Control-plane gate | `pnpm codex:check` |
| Supabase policy tests | `supabase test db` |

Use the exact package scripts as the command source of truth.

## 10. Change-specific verification

| Change | Minimum verification |
|---|---|
| Documentation only | Relative links resolve; commands match `package.json` |
| Core manifest or provider contract | Core typecheck, tests, workspace gate, schema consistency |
| CLI behavior | Focused CLI tests, scaffold matrix where relevant, workspace gate |
| Template | Scaffold a temporary application, run its tests/build, run `vscd check` |
| Supabase policy | `supabase test db` |
| Public UI | Typecheck, production build, browser checks at 375/768/1440/1920, no browser errors or overflow |
| Release-facing change | All applicable checks plus `pnpm check` and `pnpm codex:check` |

Do not declare completion while a relevant check is failing or unrun.

## 11. Release boundary

Production release is automatic from reviewed `main`.

Required sequence:

1. Create a feature branch from current `origin/main`.
2. Commit only the requested scope.
3. Push the feature branch.
4. Open a pull request.
5. Wait for required checks.
6. Merge the pull request.
7. Let `.github/workflows/ci.yml` rerun all gates and deploy the verified prebuilt artifact from the merged `main` commit.
8. Wait for the workflow to finish.
9. Verify deployment status, custom domain, DNS, TLS, and the public site in the browser.
10. Delete the merged feature branch when safe.

Never deploy production from a local agent session or from a pull-request event. Production deployment may run only after all required jobs pass on a push to `main`.

## 12. Completion definition

A task is complete only when:

- requested behavior and documentation agree;
- manifest, schema, implementation, templates, and tests are consistent where applicable;
- paths are repository-relative or web-relative;
- secret boundaries remain intact;
- unrelated worktree changes are preserved;
- required local checks pass;
- requested release and live verification have actually completed.
