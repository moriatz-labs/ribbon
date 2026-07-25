import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { projectManifestSchema, type ProjectManifest } from "@vscd/core";

export interface CodexCheckResult {
  id: string;
  ok: boolean;
  detail: string;
}

const ignoredDirectories = new Set([
  ".git",
  ".turbo",
  ".vercel",
  ".vercel-design-system",
  ".vercel-design-system-ssh",
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
  let enforceApplicationDesignSystem = true;
  let manifest: ProjectManifest | undefined;
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
    manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(root, "vscd.json"), "utf8"))
    );
    enforceApplicationDesignSystem = manifest.projectType !== "control-plane";
    const designSystem = manifest.providers.designSystem;
    const designSystemManifestOk =
      designSystem.repository === "https://github.com/Paul-M-Kallarackal/design-system" &&
      designSystem.requiredComponents.includes("DatePicker");
    results.push({
      id: "design-system:manifest",
      ok: designSystemManifestOk,
      detail: designSystemManifestOk
        ? `Paul's design system is pinned at ${designSystem.commit.slice(0, 12)}`
        : "design system repository, commit, packages, and DatePicker requirement must be pinned"
    });
    const dns = manifest.providers.dns;
    if (!dns) {
      results.push({
        id: "dns:selection",
        ok: false,
        detail: "no DNS provider selected"
      });
    } else {
      const configured = Boolean(dns.domain && dns.hostname && dns.hostname.endsWith(`.${dns.domain}`));
      results.push({
        id: `dns:${dns.provider}`,
        ok: configured && (dns.provider !== "cloudflare" || dns.proxied === false),
        detail: configured
          ? `${dns.hostname} is managed by ${dns.provider}`
          : `${dns.provider} DNS requires a domain and matching hostname`
      });
    }
    if (manifest.providers.mail?.provider === "hostinger-mail") {
        const envExample = await readFile(join(root, ".env.example"), "utf8");
        const requiredMailKeys = [
          manifest.providers.mail.apiTokenEnv,
          manifest.providers.mail.mailboxIdEnv,
          manifest.providers.mail.fromEnv,
          ...(manifest.providers.backend.provider === "supabase"
            ? ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
            : [])
        ];
        const missingMailKeys = requiredMailKeys.filter(
          (key) => !new RegExp(`^${key}=`, "m").test(envExample)
        );
        results.push({
          id: "hostinger:mail-env",
          ok: missingMailKeys.length === 0,
          detail: missingMailKeys.length === 0
            ? "Hostinger mail server variables are declared"
            : `missing mail variables: ${missingMailKeys.join(", ")}`
        });
        const hasMagicLinkRoute = await exists(join(root, "api", "auth", "magic-link.ts"));
        results.push({
          id: "hostinger:mail-api",
          ok: hasMagicLinkRoute,
          detail: hasMagicLinkRoute
            ? "server-side Hostinger magic-link route found"
            : "api/auth/magic-link.ts is missing"
        });
    }
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
    const browserVariables = [...source.matchAll(/\bVITE_[A-Z0-9_]+\b/g)].map((match) => match[0]);
    const exposesServerSecret = browserVariables.some((name) =>
      /(?:SECRET|SERVICE_ROLE|CLOUDFLARE_API_TOKEN|HOSTINGER_(?:API_TOKEN|MAIL_API_TOKEN|MAILBOX_ID)|VERCEL_TOKEN|NETLIFY_AUTH_TOKEN)/.test(name)
    );
    if (exposesServerSecret) {
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

  if (enforceApplicationDesignSystem) {
  const packageJsonSource = await readFile(join(root, "package.json"), "utf8").catch(() => "{}");
  const packageJson = JSON.parse(packageJsonSource) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const prepareScriptExists = await exists(join(root, "scripts", "prepare-design-system.mjs"));
  const prepareScriptConfigured = Boolean(
    packageJson.scripts?.["prepare:design-system"] &&
    packageJson.scripts?.build?.includes("prepare:design-system")
  );
  results.push({
    id: "design-system:prepare",
    ok: prepareScriptExists && prepareScriptConfigured,
    detail: prepareScriptExists && prepareScriptConfigured
      ? "remote builds prepare the pinned private design system"
      : "scripts/prepare-design-system.mjs and a build-time prepare:design-system step are required"
  });

  const vitestConfigSource = await readFile(join(root, "vitest.config.ts"), "utf8").catch(() => "");
  const testIsolationOk =
    vitestConfigSource.includes("configDefaults.exclude") &&
    vitestConfigSource.includes(".vercel-design-system/**");
  results.push({
    id: "design-system:test-isolation",
    ok: testIsolationOk,
    detail: testIsolationOk
      ? "application tests exclude the private design-system clone"
      : "vitest.config.ts must extend configDefaults.exclude with .vercel-design-system/**"
  });

  const envExample = await readFile(join(root, ".env.example"), "utf8").catch(() => "");
  const designSystemEnvOk =
    /^DESIGN_SYSTEM_COMMIT=[0-9a-f]{40}$/m.test(envExample) &&
    /DESIGN_SYSTEM_DEPLOY_KEY/.test(envExample);
  results.push({
    id: "design-system:env",
    ok: designSystemEnvOk,
    detail: designSystemEnvOk
      ? "design-system commit and server-only deploy-key contract are declared"
      : "declare DESIGN_SYSTEM_COMMIT and the server-only DESIGN_SYSTEM_DEPLOY_KEY contract"
  });

  const uiSourceFiles = sourceFiles.filter((file) => {
    const path = relative(root, file).replaceAll("\\", "/");
    return path.startsWith("src/") || path === "vite.config.ts" || path === "vite.config.js";
  });
  const uiSource = (await Promise.all(uiSourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const requiredDesignSystemMarkers = [
    "@paul/ui-core",
    "@paul/ui-icons",
    "@paul/ui-patterns",
    "@paul/ui-tokens/styles.css",
    "DesignSystemProvider",
    "DatePicker"
  ];
  const missingDesignSystemMarkers = requiredDesignSystemMarkers.filter(
    (marker) => !uiSource.includes(marker)
  );
  results.push({
    id: "design-system:imports",
    ok: missingDesignSystemMarkers.length === 0,
    detail: missingDesignSystemMarkers.length === 0
      ? "Paul's primitives, icons, tokens, provider, patterns, and DatePicker are wired"
      : `missing design-system wiring: ${missingDesignSystemMarkers.join(", ")}`
  });

  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  });
  const prohibitedDependencies = dependencyNames.filter((dependency) =>
    /^(?:lucide-react|tailwindcss|@tailwindcss\/|@radix-ui\/|@shadcn\/)/.test(dependency)
  );
  const nativeDateInputs: string[] = [];
  for (const file of uiSourceFiles) {
    if (/<input\b[^>]*\btype\s*=\s*["']date["']/i.test(await readFile(file, "utf8"))) {
      nativeDateInputs.push(relative(root, file));
    }
  }
  const prohibitedOk = prohibitedDependencies.length === 0 && nativeDateInputs.length === 0;
  results.push({
    id: "design-system:no-bypasses",
    ok: prohibitedOk,
    detail: prohibitedOk
      ? "no Tailwind, Lucide, shadcn, direct Radix, or native date-input bypasses found"
      : [
          prohibitedDependencies.length ? `prohibited dependencies: ${prohibitedDependencies.join(", ")}` : "",
          nativeDateInputs.length ? `native date inputs: ${nativeDateInputs.join(", ")}` : ""
        ].filter(Boolean).join("; ")
  });

  const workflowSources = await Promise.all(
    files
      .filter((file) => relative(root, file).replaceAll("\\", "/").startsWith(".github/workflows/"))
      .map((file) => readFile(file, "utf8"))
  );
  const workflowSource = workflowSources.join("\n");
  const workflowDesignSystemOk =
    workflowSource.includes("DESIGN_SYSTEM_DEPLOY_KEY") &&
    workflowSource.includes("DESIGN_SYSTEM_COMMIT");
  results.push({
    id: "design-system:workflow",
    ok: workflowDesignSystemOk,
    detail: workflowDesignSystemOk
      ? "GitHub Actions supplies the private design-system credential and commit"
      : "GitHub Actions must pass DESIGN_SYSTEM_DEPLOY_KEY and DESIGN_SYSTEM_COMMIT to builds"
  });
  } else {
    results.push({
      id: "design-system:control-plane-scope",
      ok: true,
      detail: "application wiring gates are enforced against generated scaffolds"
    });
  }

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
  if (manifest?.providers.backend.provider === "supabase") {
    results.push({
      id: "backend:supabase:rls",
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
      id: "backend:supabase:rls-tests",
      ok: hasRlsTests,
      detail: hasRlsTests ? "RLS SQL tests found" : "supabase/tests/*.sql is missing"
    });
  } else if (manifest?.providers.backend.provider === "firebase") {
    const firestoreRules = await readFile(join(root, "firestore.rules"), "utf8").catch(() => "");
    const storageRules = await readFile(join(root, "storage.rules"), "utf8").catch(() => "");
    const rulesOk =
      firestoreRules.includes("request.auth.uid")
      && firestoreRules.includes("owner_id")
      && storageRules.includes("request.auth.uid")
      && storageRules.includes("userId");
    results.push({
      id: "backend:firebase:rules",
      ok: rulesOk,
      detail: rulesOk
        ? "Firestore and Storage rules enforce owner-scoped access"
        : "owner-scoped firestore.rules and storage.rules are required"
    });
    results.push({
      id: "backend:firebase:config",
      ok: await exists(join(root, "firebase.json")),
      detail: await exists(join(root, "firebase.json")) ? "firebase.json found" : "firebase.json is missing"
    });
    const hasRulesTests = files.some((file) => {
      const path = projectRelativePath(file);
      return /(?:^|\/)firebase-rules\.test\.[cm]?[jt]s$/.test(path);
    });
    results.push({
      id: "backend:firebase:rules-tests",
      ok: hasRulesTests,
      detail: hasRulesTests ? "Firebase authorization rule tests found" : "firebase-rules.test.ts is missing"
    });
  }

  const workflows = files.filter((file) => {
    const path = projectRelativePath(file);
    return path.startsWith(".github/workflows/") && /\.ya?ml$/.test(path);
  });
  const releaseWorkflowSource = (await Promise.all(
    workflows.map((file) => readFile(file, "utf8"))
  )).join("\n");
  results.push({
    id: "release:workflow",
    ok: workflows.length > 0 && Boolean(
      manifest && releaseWorkflowSource.toLowerCase().includes(manifest.providers.deployment.provider)
    ),
    detail: workflows.length > 0 && manifest
      ? `${manifest.providers.deployment.provider} release workflow found`
      : "GitHub Actions workflow missing"
  });
  if (manifest?.providers.deployment.provider === "netlify") {
    const requiredBuildVariables = manifest.providers.backend.provider === "supabase"
      ? ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
      : [
          "VITE_FIREBASE_API_KEY",
          "VITE_FIREBASE_AUTH_DOMAIN",
          "VITE_FIREBASE_PROJECT_ID",
          "VITE_FIREBASE_STORAGE_BUCKET",
          "VITE_FIREBASE_APP_ID"
        ];
    const missingBuildVariables = requiredBuildVariables.filter(
      (variable) => !releaseWorkflowSource.includes(variable)
    );
    results.push({
      id: "release:netlify:backend-env",
      ok: missingBuildVariables.length === 0,
      detail: missingBuildVariables.length === 0
        ? `${manifest.providers.backend.provider} public build variables are wired to Netlify CI`
        : `missing Netlify build variables: ${missingBuildVariables.join(", ")}`
    });
  }

  return results;
}
