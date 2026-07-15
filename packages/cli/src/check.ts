import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { projectManifestSchema } from "@vscd/core";

export interface CodexCheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

const ignoredDirectories = new Set([
  ".git",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "node_modules"
]);

async function exists(path: string) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function checkRls(sql: string) {
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");
  const tables = [
    ...normalized.matchAll(/create table(?: if not exists)? public\.([a-z0-9_]+)/g)
  ].map((match) => match[1]).filter((table): table is string => Boolean(table));
  const missing = tables.filter(
    (table) => !normalized.includes(`alter table public.${table} enable row level security`)
  );
  return { tables, missing };
}

export async function runCodexCheck(root: string): Promise<CodexCheckResult[]> {
  const results: CodexCheckResult[] = [];
  const requiredFiles = ["package.json", "vscd.json", ".env.example"];

  for (const file of requiredFiles) {
    results.push({
      id: `file:${file}`,
      ok: await exists(join(root, file)),
      detail: `${file} ${await exists(join(root, file)) ? "found" : "missing"}`
    });
  }

  const lockfiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock"];
  const presentLockfiles = [];
  for (const lockfile of lockfiles) {
    if (await exists(join(root, lockfile))) {
      presentLockfiles.push(lockfile);
    }
  }
  results.push({
    id: "lockfile",
    ok: presentLockfiles.length === 1,
    detail: presentLockfiles.length === 1
      ? `${presentLockfiles[0]} is the single lockfile`
      : `expected one lockfile, found ${presentLockfiles.length}`
  });

  try {
    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(root, "vscd.json"), "utf8"))
    );
    results.push({
      id: "cloudflare:dns-only",
      ok: manifest.providers.cloudflare.proxied === false,
      detail: "Vercel hostname is configured as Cloudflare DNS-only"
    });
  } catch (error) {
    results.push({
      id: "manifest:valid",
      ok: false,
      detail: error instanceof Error ? error.message : "vscd.json is invalid"
    });
  }

  const files = await walk(root);
  const sourceFiles = files.filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
  const secretLeaks: string[] = [];

  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    if (/VITE_(?:SUPABASE_SERVICE_ROLE|CLOUDFLARE_API_TOKEN|VERCEL_TOKEN)/.test(source)) {
      secretLeaks.push(relative(root, file));
    }
  }
  results.push({
    id: "secrets:browser",
    ok: secretLeaks.length === 0,
    detail: secretLeaks.length === 0
      ? "no server secrets are browser-prefixed"
      : `browser secret references: ${secretLeaks.join(", ")}`
  });

  const projectRelativePath = (file: string) => relative(root, file).replaceAll("\\", "/");
  const migrationFiles = files.filter((file) => {
    const path = projectRelativePath(file);
    return path.startsWith("supabase/migrations/") && path.endsWith(".sql");
  });
  const rlsMissing: string[] = [];
  let tableCount = 0;
  for (const migration of migrationFiles) {
    const rls = checkRls(await readFile(migration, "utf8"));
    tableCount += rls.tables.length;
    rlsMissing.push(...rls.missing.map((table) => `${basename(migration)}:${table}`));
  }
  results.push({
    id: "supabase:rls",
    ok: migrationFiles.length > 0 && tableCount > 0 && rlsMissing.length === 0,
    detail: rlsMissing.length > 0
      ? `RLS missing for ${rlsMissing.join(", ")}`
      : `${tableCount} public tables declare RLS`
  });

  const hasRlsTests = files.some((file) => {
    const path = projectRelativePath(file);
    return path.startsWith("supabase/tests/") && path.endsWith(".sql");
  });
  results.push({
    id: "supabase:rls-tests",
    ok: hasRlsTests,
    detail: hasRlsTests ? "RLS SQL tests found" : "supabase/tests/*.sql is missing"
  });

  const workflows = files.filter((file) => {
    const path = projectRelativePath(file);
    return path.startsWith(".github/workflows/") && /\.ya?ml$/.test(path);
  });
  results.push({
    id: "release:workflow",
    ok: workflows.length > 0,
    detail: workflows.length > 0 ? `${workflows.length} workflow files found` : "GitHub Actions workflow missing"
  });

  return results;
}
