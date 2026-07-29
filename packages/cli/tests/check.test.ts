import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCodexCheck } from "../src/check.js";

const designSystem = {
  provider: "strawn",
  source: "npm",
  version: "0.1.0",
  packages: ["strawn", "strawn-icons"],
  requiredComponents: ["ThemeProvider", "TooltipProvider"]
};

describe("Codex check", () => {
  it("detects a public table without RLS", async () => {
    const root = await mkdtemp(join(tmpdir(), "ribbon-check-"));
    await mkdir(join(root, "supabase", "migrations"), { recursive: true });
    await writeFile(join(root, "package.json"), "{}", "utf8");
    await writeFile(join(root, ".env.example"), "VITE_SUPABASE_URL=", "utf8");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(
      join(root, "ribbon.json"),
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
    expect(results.find((check) => check.id === "backend:supabase:rls")?.ok).toBe(false);
  });

  it("requires the Hostinger magic-link route when mail is configured", async () => {
    const root = await mkdtemp(join(tmpdir(), "ribbon-mail-check-"));
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
      join(root, "ribbon.json"),
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

  it("rejects UI-library bypasses and missing Strawn wiring", async () => {
    const root = await mkdtemp(join(tmpdir(), "ribbon-design-system-check-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        dependencies: {
          "lucide-react": "latest",
          strawn: "0.1.0",
          "strawn-icons": "0.1.0"
        }
      }),
      "utf8"
    );
    await writeFile(join(root, ".env.example"), "", "utf8");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'", "utf8");
    await writeFile(
      join(root, "src", "App.tsx"),
      'export function App(){ return <input type="date" />; }',
      "utf8"
    );
    await writeFile(
      join(root, "ribbon.json"),
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
    expect(results.find((check) => check.id === "design-system:packages")?.ok).toBe(true);
  });
});
