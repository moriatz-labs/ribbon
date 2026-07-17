import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCodexCheck } from "../src/check.js";

const designSystem = {
  source: "C:\\UI",
  repository: "https://github.com/Paul-M-Kallarackal/design-system",
  commit: "4a488a815da102a547254ee16d1b4fabd741857b",
  packages: [
    "@paul/ui-core",
    "@paul/ui-icons",
    "@paul/ui-patterns",
    "@paul/ui-tokens",
    "@paul/ui-themes"
  ],
  requiredComponents: ["DatePicker"]
};

describe("Codex check", () => {
  it("detects a public table without RLS", async () => {
    const root = await mkdtemp(join(tmpdir(), "vscd-check-"));
    await mkdir(join(root, "supabase", "migrations"), { recursive: true });
    await writeFile(join(root, "package.json"), "{}", "utf8");
    await writeFile(join(root, ".env.example"), "VITE_SUPABASE_URL=", "utf8");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(
      join(root, "vscd.json"),
      JSON.stringify({
        name: "Test",
        slug: "test",
        framework: "vite-react",
        providers: {
          vercel: {},
          supabase: {},
          cloudflare: { proxied: false },
          designSystem
        },
        urls: {},
        status: "local"
      }),
      "utf8"
    );
    await writeFile(
      join(root, "supabase", "migrations", "001.sql"),
      "create table public.items (id uuid primary key);",
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "supabase:rls")?.ok).toBe(false);
  });

  it("requires the Hostinger magic-link route when mail is configured", async () => {
    const root = await mkdtemp(join(tmpdir(), "vscd-mail-check-"));
    await mkdir(join(root, ".github", "workflows"), { recursive: true });
    await mkdir(join(root, "supabase", "migrations"), { recursive: true });
    await mkdir(join(root, "supabase", "tests"), { recursive: true });
    await writeFile(join(root, "package.json"), "{}", "utf8");
    await writeFile(
      join(root, ".env.example"),
      [
        "VITE_SUPABASE_URL=",
        "SUPABASE_URL=",
        "SUPABASE_SERVICE_ROLE_KEY=",
        "HOSTINGER_MAIL_API_TOKEN=",
        "HOSTINGER_MAILBOX_ID=",
        "HOSTINGER_MAIL_FROM="
      ].join("\n"),
      "utf8"
    );
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(join(root, ".github", "workflows", "release.yml"), "name: Release", "utf8");
    await writeFile(join(root, "supabase", "tests", "rls.sql"), "select 1;", "utf8");
    await writeFile(
      join(root, "supabase", "migrations", "001.sql"),
      [
        "create table public.items (id uuid primary key);",
        "alter table public.items enable row level security;"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      join(root, "vscd.json"),
      JSON.stringify({
        name: "Mail Test",
        slug: "mail-test",
        framework: "vite-react",
        providers: {
          vercel: {},
          supabase: {},
          hostinger: {
            domain: "moriatz.com",
            hostname: "mail-test.moriatz.com",
            ttl: 300,
            mail: {
              provider: "hostinger-mail",
              apiTokenEnv: "HOSTINGER_MAIL_API_TOKEN",
              mailboxIdEnv: "HOSTINGER_MAILBOX_ID",
              fromEnv: "HOSTINGER_MAIL_FROM"
            }
          },
          designSystem
        },
        urls: {},
        status: "local"
      }),
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "hostinger:mail-env")?.ok).toBe(true);
    expect(results.find((check) => check.id === "hostinger:mail-api")?.ok).toBe(false);
  });

  it("rejects UI-library bypasses and native date inputs", async () => {
    const root = await mkdtemp(join(tmpdir(), "vscd-design-system-check-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { "lucide-react": "latest" } }),
      "utf8"
    );
    await writeFile(join(root, ".env.example"), "DESIGN_SYSTEM_COMMIT=4a488a815da102a547254ee16d1b4fabd741857b\n# DESIGN_SYSTEM_DEPLOY_KEY", "utf8");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(
      join(root, "src", "App.tsx"),
      'export function App(){ return <input type="date" />; }',
      "utf8"
    );
    await writeFile(
      join(root, "vscd.json"),
      JSON.stringify({
        name: "Bypass Test",
        slug: "bypass-test",
        framework: "vite-react",
        providers: {
          vercel: {},
          supabase: {},
          cloudflare: { proxied: false },
          designSystem
        },
        urls: {},
        status: "local"
      }),
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "design-system:no-bypasses")?.ok).toBe(false);
    expect(results.find((check) => check.id === "design-system:imports")?.ok).toBe(false);
    expect(results.find((check) => check.id === "design-system:test-isolation")?.ok).toBe(false);
  });

  it("rejects selectors that focus a native date input", async () => {
    const root = await mkdtemp(join(tmpdir(), "vscd-date-selector-check-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), "{}", "utf8");
    await writeFile(join(root, ".env.example"), "DESIGN_SYSTEM_COMMIT=4a488a815da102a547254ee16d1b4fabd741857b\n# DESIGN_SYSTEM_DEPLOY_KEY", "utf8");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(
      join(root, "src", "App.tsx"),
      `export function focusDate(){ document.querySelector<HTMLInputElement>('input[type="date"]')?.focus(); }`,
      "utf8"
    );
    await writeFile(
      join(root, "vscd.json"),
      JSON.stringify({
        name: "Selector Test",
        slug: "selector-test",
        framework: "vite-react",
        providers: {
          vercel: {},
          supabase: {},
          cloudflare: { proxied: false },
          designSystem
        },
        urls: {},
        status: "local"
      }),
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "design-system:no-bypasses")?.ok).toBe(false);
    expect(results.find((check) => check.id === "design-system:no-bypasses")?.detail).toContain("native date selectors");
  });
});
