import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

interface ProviderSlots {
  deployment?: { provider?: string; projectName?: string; siteName?: string };
  backend?: { provider?: string; projectRef?: string };
  dns?: { provider?: string; zoneId?: string };
}

describe("provider capability migration", () => {
  it("normalizes legacy registry rows and preserves canonical rows", async () => {
    const database = new PGlite();
    try {
      await database.exec(`
        create table public.vscd_projects (
          id integer generated always as identity primary key,
          providers jsonb not null default
            '{"vercel":true,"supabase":true,"cloudflare":false,"hostinger":false,"designSystem":true}'::jsonb
        );
        insert into public.vscd_projects (providers) values
          ('{"vercel":true,"supabase":true,"hostinger":true,"cloudflare":false,"designSystem":true}'::jsonb),
          ('{"vercel":{"projectName":"legacy"},"supabase":{"projectRef":"legacy-ref"},"cloudflare":{"zoneId":"zone","domain":"example.com","hostname":"app.example.com","proxied":false},"designSystem":{"source":"../design-system"}}'::jsonb),
          ('{"deployment":{"provider":"netlify","siteName":"current"},"backend":{"provider":"firebase"},"designSystem":true}'::jsonb);
      `);
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
      const migration = await readFile(
        resolve(root, "supabase/migrations/20260718112435_provider_capability_slots.sql"),
        "utf8"
      );
      await database.exec(migration);
      await database.exec("insert into public.vscd_projects default values;");

      const result = await database.query<{ providers: ProviderSlots }>(
        "select providers from public.vscd_projects order by id"
      );
      const rows = result.rows.map((row) => row.providers);

      expect(rows[0]).toMatchObject({
        deployment: { provider: "vercel" },
        backend: { provider: "supabase" },
        dns: { provider: "hostinger" }
      });
      expect(rows[1]).toMatchObject({
        deployment: { provider: "vercel", projectName: "legacy" },
        backend: { provider: "supabase", projectRef: "legacy-ref" },
        dns: { provider: "cloudflare", zoneId: "zone" }
      });
      expect(rows[2]).toMatchObject({
        deployment: { provider: "netlify", siteName: "current" },
        backend: { provider: "firebase" }
      });
      expect(rows[3]).toMatchObject({
        deployment: { provider: "vercel" },
        backend: { provider: "supabase" }
      });
    } finally {
      await database.close();
    }
  });
});
