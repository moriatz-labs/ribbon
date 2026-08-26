import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
  it("validates the GitExplore React/Vite, Rust, Neo4j, and Vercel Services fixture", async () => {
    const root = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));

    const results = await runCodexCheck(root);
    const profileChecks = results.filter((check) => check.id.startsWith("profile:rust-services:"));

    expect(profileChecks.map((check) => check.id)).toEqual([
      "profile:rust-services:docker",
      "profile:rust-services:vercel",
      "profile:rust-services:neo4j-schema",
      "profile:rust-services:react-vite-entry",
      "profile:rust-services:design-system",
      "profile:rust-services:release",
      "profile:rust-services:readiness"
    ]);
    expect(results.filter((check) => !check.ok)).toEqual([]);
  });

  it("requires a service-local SPA fallback and a plain top-level web catch-all", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), "ribbon-gitexplore-routes-check-"));
    const root = join(directory, "gitexplore");
    await cp(fixture, root, { recursive: true });

    const vercelPath = join(root, "vercel.json");
    const vercel = JSON.parse(await readFile(vercelPath, "utf8")) as {
      services: {
        web: {
          rewrites?: Array<{ source: string; destination: string }>;
        };
      };
      rewrites: Array<{
        source: string;
        destination: { service: string; path?: string };
        transforms?: Array<{ type: string; op: string; args: string }>;
      }>;
    };
    const serviceRewrites = vercel.services.web.rewrites;
    if (!serviceRewrites) throw new Error("fixture is missing the web service rewrites");

    delete vercel.services.web.rewrites;
    await writeFile(vercelPath, JSON.stringify(vercel), "utf8");
    let results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:vercel")?.ok).toBe(false);

    vercel.services.web.rewrites = serviceRewrites;
    const webCatchall = vercel.rewrites.find((rewrite) => rewrite.source === "/(.*)");
    if (!webCatchall) throw new Error("fixture is missing the top-level web catch-all");

    webCatchall.destination.path = "/index.html";
    await writeFile(vercelPath, JSON.stringify(vercel), "utf8");
    results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:vercel")?.ok).toBe(false);

    delete webCatchall.destination.path;
    webCatchall.transforms = [{ type: "request.path", op: "set", args: "/index.html" }];
    await writeFile(vercelPath, JSON.stringify(vercel), "utf8");
    results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:vercel")?.ok).toBe(false);

    delete webCatchall.transforms;
    const catchallIndex = vercel.rewrites.indexOf(webCatchall);
    vercel.rewrites.splice(catchallIndex, 0, {
      source: "/login",
      destination: { service: "web" }
    });
    await writeFile(vercelPath, JSON.stringify(vercel), "utf8");
    results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:vercel")?.ok).toBe(false);
  });

  it("rejects stale Svelte entry artifacts and incorrect GitExplore Strawn package pins", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), "ribbon-gitexplore-check-"));
    const root = join(directory, "gitexplore");
    await cp(fixture, root, { recursive: true });

    const webPackagePath = join(root, "apps", "web", "package.json");
    const webPackage = JSON.parse(await readFile(webPackagePath, "utf8")) as {
      dependencies: Record<string, string>;
    };
    webPackage.dependencies.strawn = "0.1.0";
    await writeFile(webPackagePath, JSON.stringify(webPackage), "utf8");
    await writeFile(
      join(root, "apps", "web", "svelte.config.js"),
      "export default { kit: {} };",
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:react-vite-entry")?.ok).toBe(false);
    expect(results.find((check) => check.id === "profile:rust-services:design-system")?.ok).toBe(false);
  });

  it("reports an invalid service manifest without misleading generic scaffold failures", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), "ribbon-invalid-service-check-"));
    const root = join(directory, "gitexplore");
    await cp(fixture, root, { recursive: true });

    const manifestPath = join(root, "ribbon.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      providers: { designSystem: Record<string, unknown> };
    };
    manifest.providers.designSystem = {
      provider: "strawn",
      source: "repository-pin",
      version: "0.1.0",
      commit: "7c4bc3421f41cfd91aaa970c2066e8382853d3da",
      integration: "semantic-token-snapshot"
    };
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "manifest:valid")?.ok).toBe(false);
    expect(results.some((check) => check.id === "design-system:packages")).toBe(false);
    expect(results.some((check) => check.id === "release:workflow")).toBe(false);
  });

  it("scopes exact Strawn lock pins to the GitExplore web importer", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), "ribbon-gitexplore-lock-check-"));
    const root = join(directory, "gitexplore");
    await cp(fixture, root, { recursive: true });

    const lockfilePath = join(root, "pnpm-lock.yaml");
    const lockfile = await readFile(lockfilePath, "utf8");
    await writeFile(
      lockfilePath,
      lockfile.replace("        specifier: 0.2.0\n        version: 0.2.0", "        specifier: 0.1.0\n        version: 0.1.0"),
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:design-system")?.ok).toBe(false);
    expect(results.find((check) => check.id === "profile:rust-services:react-vite-entry")?.ok).toBe(true);
  });

  it("rejects a stale Svelte service declaration and browser API-origin override", async () => {
    const fixture = fileURLToPath(new URL("./fixtures/gitexplore", import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), "ribbon-gitexplore-origin-check-"));
    const root = join(directory, "gitexplore");
    await cp(fixture, root, { recursive: true });

    const vercelPath = join(root, "vercel.json");
    const vercel = JSON.parse(await readFile(vercelPath, "utf8")) as {
      services: { web: Record<string, unknown> };
    };
    vercel.services.web.framework = "sveltekit";
    vercel.services.web.bindings = [{
      type: "service",
      service: "api",
      env: "GITEXPLORE_INTERNAL_API_BASE_URL"
    }];
    await writeFile(vercelPath, JSON.stringify(vercel), "utf8");
    await writeFile(
      join(root, "apps", "web", "src", "api.ts"),
      "export const apiBaseUrl = import.meta.env.VITE_GITEXPLORE_API_BASE_URL || window.location.origin;",
      "utf8"
    );

    const results = await runCodexCheck(root);
    expect(results.find((check) => check.id === "profile:rust-services:vercel")?.ok).toBe(false);
    expect(results.find((check) => check.id === "profile:rust-services:react-vite-entry")?.ok).toBe(false);
  });

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
