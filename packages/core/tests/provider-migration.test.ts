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

const PGLITE_TEST_TIMEOUT_MS = 30_000;

describe("provider capability migration", () => {
  it("normalizes legacy registry rows and preserves canonical rows", async () => {
    const database = new PGlite();
    try {
      await database.exec(`
        create table public.ribbon_projects (
          id integer generated always as identity primary key,
          providers jsonb not null default
            '{"vercel":true,"supabase":true,"cloudflare":false,"hostinger":false,"designSystem":true}'::jsonb
        );
        insert into public.ribbon_projects (providers) values
          ('{"vercel":true,"supabase":true,"hostinger":true,"cloudflare":false,"designSystem":true}'::jsonb),
          ('{"vercel":{"projectName":"legacy"},"supabase":{"projectRef":"legacy-ref"},"cloudflare":{"zoneId":"zone","domain":"example.com","hostname":"app.example.com","proxied":false},"designSystem":true}'::jsonb),
          ('{"deployment":{"provider":"netlify","siteName":"current"},"backend":{"provider":"firebase"},"designSystem":true}'::jsonb);
      `);
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
      const migration = await readFile(
        resolve(root, "supabase/migrations/20260718112435_provider_capability_slots.sql"),
        "utf8"
      );
      await database.exec(migration);
      await database.exec("insert into public.ribbon_projects default values;");

      const result = await database.query<{ providers: ProviderSlots }>(
        "select providers from public.ribbon_projects order by id"
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
  }, PGLITE_TEST_TIMEOUT_MS);

  it("renames an existing registry and preserves its data", async () => {
    const database = new PGlite();
    try {
      await database.exec(`
        create table public.vscd_projects (
          id integer generated always as identity primary key,
          owner_id integer not null,
          name text not null,
          slug text not null,
          status text not null default 'draft',
          providers jsonb not null default '{"designSystem":true}'::jsonb,
          urls jsonb not null default '{}'::jsonb,
          updated_at timestamptz not null default now(),
          unique (owner_id, slug)
        );
        create index vscd_projects_owner_id_idx
          on public.vscd_projects (owner_id);
        create index vscd_projects_owner_updated_idx
          on public.vscd_projects (owner_id, updated_at desc);

        create function public.set_vscd_project_updated_at()
        returns trigger
        language plpgsql
        as $$
        begin
          new.updated_at = now();
          return new;
        end;
        $$;

        create trigger set_vscd_project_updated_at
        before update on public.vscd_projects
        for each row execute function public.set_vscd_project_updated_at();

        insert into public.vscd_projects (
          owner_id,
          name,
          slug,
          status,
          providers,
          urls
        ) values (
          1,
          'VSCD',
          'vscd',
          'production',
          '{"designSystem":true}'::jsonb,
          '{"production":"https://vscd.example","repository":"https://example.com/vscd"}'::jsonb
        );
      `);

      const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
      const migration = await readFile(
        resolve(root, "supabase/migrations/20260729000000_ribbon_identity.sql"),
        "utf8"
      );
      await database.exec(migration);

      const registry = await database.query<{
        name: string;
        slug: string;
        status: string;
        providers: {
          designSystem: { provider: string; source: string; version: string };
        };
        urls: Record<string, string>;
      }>("select name, slug, status, providers, urls from public.ribbon_projects");
      const structures = await database.query<{
        ribbon_table: string | null;
        legacy_table: string | null;
        ribbon_function: string | null;
      }>(`
        select
          to_regclass('public.ribbon_projects')::text as ribbon_table,
          to_regclass('public.vscd_projects')::text as legacy_table,
          to_regprocedure('public.set_ribbon_project_updated_at()')::text as ribbon_function
      `);

      expect(structures.rows[0]).toMatchObject({
        ribbon_table: "ribbon_projects",
        legacy_table: null,
        ribbon_function: "set_ribbon_project_updated_at()"
      });
      expect(registry.rows[0]).toMatchObject({
        name: "Ribbon",
        slug: "ribbon",
        status: "local",
        providers: {
          designSystem: {
            provider: "strawn",
            source: "npm",
            version: "0.1.0"
          }
        },
        urls: { local: "http://localhost:4310" }
      });
    } finally {
      await database.close();
    }
  }, PGLITE_TEST_TIMEOUT_MS);
});
