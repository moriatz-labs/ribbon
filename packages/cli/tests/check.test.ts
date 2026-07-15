import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCodexCheck } from "../src/check.js";

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
          designSystem: { source: "C:\\UI" }
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
});

