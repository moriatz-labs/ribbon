import { readFile, readdir } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";
import { projectManifestSchema, type ProjectManifest } from "@moriatz/ribbon-core";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRelativePath(path: string) {
  return !isAbsolute(path) && !/^[A-Za-z]:/.test(path);
}

function isRepositoryRelative(path: string) {
  const normalized = path.replaceAll("\\", "/");
  return isRelativePath(path)
    && normalized !== ".."
    && !normalized.startsWith("../")
    && !normalized.includes("/../");
}

function pnpmImporter(source: string, importer: string) {
  const marker = `  ${importer}:\n`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const content = source.slice(start + marker.length);
  const boundary = content.search(/\n(?:  \S|\S)/);
  return boundary < 0 ? content : content.slice(0, boundary);
}

async function checkRustServicesArtifacts(
  root: string,
  manifest: ProjectManifest,
  files: string[]
): Promise<CodexCheckResult[]> {
  const results: CodexCheckResult[] = [];
  const backend = manifest.providers.backend;
  const graph = manifest.providers.graph;
  if (backend.provider !== "rust-axum" || graph?.provider !== "neo4j-aura") {
    return [{
      id: "profile:rust-services:contract",
      ok: false,
      detail: "Rust/Axum and Neo4j Aura provider slots are required"
    }];
  }

  const dockerfilePath = join(root, backend.entrypoint);
  const dockerfile = await readFile(dockerfilePath, "utf8").catch(() => "");
  const configSource = await readFile(join(root, "src", "config.rs"), "utf8").catch(() => "");
  const dockerMarkers = [
    "FROM rust:",
    "cargo build --locked --release",
    "ENV PORT=",
    "USER gitexplore",
    'CMD ["gitexplore", "serve"]'
  ];
  const missingDockerMarkers = dockerMarkers.filter((marker) => !dockerfile.includes(marker));
  const portBindingOk = configSource.includes('values.get("PORT")')
    && configSource.includes('format!("0.0.0.0:{port}")');
  const dockerOk = isRepositoryRelative(backend.entrypoint)
    && dockerfile.length > 0
    && missingDockerMarkers.length === 0
    && portBindingOk;
  results.push({
    id: "profile:rust-services:docker",
    ok: dockerOk,
    detail: dockerOk
      ? `${backend.entrypoint} builds locked Rust, runs non-root, and honors PORT`
      : `invalid Rust container contract; missing: ${[
          ...missingDockerMarkers,
          ...(portBindingOk ? [] : ["Rust PORT binding"])
        ].join(", ")}`
  });

  const vercel = await readJson(join(root, "vercel.json"));
  const services = isRecord(vercel?.services) ? vercel.services : undefined;
  const web = isRecord(services?.web) ? services.web : undefined;
  const api = isRecord(services?.api) ? services.api : undefined;
  const rewrites = Array.isArray(vercel?.rewrites) ? vercel.rewrites : [];
  const actualRoutes = rewrites.map((rewrite) => {
    if (!isRecord(rewrite) || typeof rewrite.source !== "string" || !isRecord(rewrite.destination)) {
      return "invalid";
    }
    if (
      Object.keys(rewrite).sort().join(",") !== "destination,source"
      || Object.keys(rewrite.destination).sort().join(",") !== "service"
    ) {
      return "invalid";
    }
    return `${rewrite.source}->${String(rewrite.destination.service)}`;
  });
  const expectedRoutes = [
    "/auth/(.*)->api",
    "/graphql->api",
    "/health->api",
    "/sync/(.*)->api",
    "/bookmarks->api",
    "/categories->api",
    "/explore/snapshots->api",
    "/explore->api",
    "/(.*)->web"
  ];
  const webRewrites = Array.isArray(web?.rewrites) ? web.rewrites : [];
  const hasServiceSpaFallback = webRewrites.some((rewrite) => isRecord(rewrite)
    && rewrite.source === "/(.*)"
    && rewrite.destination === "/index.html");
  const servicesOk = Boolean(
    vercel
    && !("experimentalServices" in vercel)
    && web?.root === "apps/web/"
    && web.framework === "vite"
    && !("bindings" in web)
    && api?.root === "."
    && api.entrypoint === backend.entrypoint
    && api.runtime === "container"
    && actualRoutes.join("|") === expectedRoutes.join("|")
    && hasServiceSpaFallback
  );
  results.push({
    id: "profile:rust-services:vercel",
    ok: servicesOk,
    detail: servicesOk
      ? "Vercel Services keeps API routes at the root and owns the Vite SPA fallback inside the web service"
      : "vercel.json must keep ordered API rewrites followed by one plain web catch-all, while services.web.rewrites owns the /(.*) to /index.html SPA fallback"
  });

  const schemaPath = graph.schema;
  const neo4jSchema = isRepositoryRelative(schemaPath)
    ? await readFile(join(root, schemaPath), "utf8").catch(() => "")
    : "";
  const neo4jMarkers = [
    "CREATE CONSTRAINT",
    "IF NOT EXISTS",
    "FOR (n:User)",
    "FOR (n:Repository)",
    "FOR (n:OAuthPendingState)",
    "FOR (n:BrowserSession)"
  ];
  const missingNeo4jMarkers = neo4jMarkers.filter((marker) => !neo4jSchema.includes(marker));
  results.push({
    id: "profile:rust-services:neo4j-schema",
    ok: missingNeo4jMarkers.length === 0,
    detail: missingNeo4jMarkers.length === 0
      ? `${schemaPath} contains idempotent graph, OAuth-state, and session constraints`
      : `Neo4j schema is missing: ${missingNeo4jMarkers.join(", ")}`
  });

  const webPackage = await readJson(join(root, "apps", "web", "package.json"));
  const webDependencies = isRecord(webPackage?.dependencies) ? webPackage.dependencies : {};
  const webDevDependencies = isRecord(webPackage?.devDependencies) ? webPackage.devDependencies : {};
  const webDependencyNames = Object.keys({ ...webDependencies, ...webDevDependencies });
  const indexSource = await readFile(join(root, "apps", "web", "index.html"), "utf8").catch(() => "");
  const mainSource = await readFile(join(root, "apps", "web", "src", "main.tsx"), "utf8").catch(() => "");
  const apiSource = await readFile(join(root, "apps", "web", "src", "api.ts"), "utf8").catch(() => "");
  const viteSource = await readFile(join(root, "apps", "web", "vite.config.ts"), "utf8").catch(() => "");
  const staleSvelteFiles = files.filter((file) => {
    const path = relative(root, file).replaceAll("\\", "/");
    return /^apps\/web\/svelte\.config\.[^/]+$/.test(path)
      || (path.startsWith("apps/web/") && path.endsWith(".svelte"));
  });
  const reactEntryOk = indexSource.includes('<div id="root"></div>')
    && indexSource.includes('src="/src/main.tsx"')
    && /from\s+["']react-dom\/client["']/.test(mainSource)
    && /from\s+["']strawn["']/.test(mainSource)
    && mainSource.includes("createRoot")
    && mainSource.includes("ThemeProvider")
    && apiSource.includes("window.location.origin")
    && !apiSource.includes("import.meta.env")
    && !apiSource.includes("process.env")
    && viteSource.includes("@vitejs/plugin-react")
    && viteSource.includes("react()")
    && typeof webDependencies.react === "string"
    && typeof webDependencies["react-dom"] === "string"
    && typeof webDevDependencies["@vitejs/plugin-react"] === "string"
    && webDependencyNames.every((name) => name !== "svelte" && !name.startsWith("@sveltejs/"))
    && staleSvelteFiles.length === 0;
  results.push({
    id: "profile:rust-services:react-vite-entry",
    ok: reactEntryOk,
    detail: reactEntryOk
      ? "apps/web boots React through Vite and contains no Svelte adapter artifacts"
      : "apps/web must provide the Vite React root, plugin, dependencies, and ThemeProvider without Svelte artifacts"
  });

  const designSystem = manifest.providers.designSystem;
  const webSourceFiles = files.filter((file) => {
    const path = relative(root, file).replaceAll("\\", "/");
    return path.startsWith("apps/web/src/") && /\.(?:ts|tsx|js|jsx)$/.test(path);
  });
  const webSource = (await Promise.all(webSourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const lockfile = (await readFile(join(root, "pnpm-lock.yaml"), "utf8").catch(() => ""))
    .replaceAll("\r\n", "\n");
  const webImporter = pnpmImporter(lockfile, "apps/web");
  const lockfileOk = webImporter.includes("      strawn:\n        specifier: 0.2.0\n        version: 0.2.0")
    && webImporter.includes("      strawn-icons:\n        specifier: 0.1.1\n        version: 0.1.1");
  const packagesOk = designSystem.version === "0.2.0"
    && designSystem.packages.join(",") === "strawn,strawn-icons"
    && webDependencies.strawn === "0.2.0"
    && webDependencies["strawn-icons"] === "0.1.1";
  const importsOk = /from\s+["']strawn["']/.test(webSource)
    && /from\s+["']strawn-icons["']/.test(webSource)
    && webSource.includes("ThemeProvider")
    && webSource.includes("window.location.origin")
    && !webSource.includes("PUBLIC_GITEXPLORE_API_BASE_URL")
    && !apiSource.includes("import.meta.env")
    && !apiSource.includes("process.env");
  const designSystemOk = packagesOk && importsOk && lockfileOk;
  results.push({
    id: "profile:rust-services:design-system",
    ok: designSystemOk,
    detail: designSystemOk
      ? "apps/web imports Strawn 0.2.0 and strawn-icons 0.1.1 from exact package and lockfile pins"
      : "the React imports, manifest, apps/web dependencies, and lockfile must pin strawn@0.2.0 and strawn-icons@0.1.1"
  });

  return results;
}

async function checkRustServicesRelease(
  root: string,
  manifest: ProjectManifest,
  releaseWorkflowSource: string
): Promise<CodexCheckResult[]> {
  const rootPackage = await readJson(join(root, "package.json"));
  const devDependencies = isRecord(rootPackage?.devDependencies) ? rootPackage.devDependencies : {};
  const requiredMarkers = [
    "branches: [main]",
    "cancel-in-progress: false",
    "actions/cache@v4",
    "pnpm install --frozen-lockfile",
    "cargo clippy --all-targets --locked -- -D warnings",
    "cargo test --locked",
    "pnpm --filter @gitexplore/web check",
    "productionReadiness",
    "readiness?.ready !== true",
    "blockers.length !== 0",
    "pnpm exec vercel build --prod",
    "pnpm exec vercel deploy --prebuilt --prod",
    "VERCEL_TOKEN",
    "VERCEL_ORG_ID",
    "VERCEL_PROJECT_ID"
  ];
  const missingMarkers = requiredMarkers.filter((marker) => !releaseWorkflowSource.includes(marker));
  const buildIndex = releaseWorkflowSource.indexOf("pnpm exec vercel build --prod");
  const deployIndex = releaseWorkflowSource.indexOf("pnpm exec vercel deploy --prebuilt --prod");
  const workflowOk = missingMarkers.length === 0
    && buildIndex >= 0
    && deployIndex > buildIndex
    && devDependencies.vercel === "56.3.1";
  const results: CodexCheckResult[] = [{
    id: "profile:rust-services:release",
    ok: workflowOk,
    detail: workflowOk
      ? "main releases are serialized, gated, cached, built once, and deployed prebuilt with Vercel 56.3.1"
      : `release workflow contract is incomplete: ${[
          ...missingMarkers,
          ...(devDependencies.vercel === "56.3.1" ? [] : ["vercel@56.3.1 package pin"]),
          ...(deployIndex > buildIndex && buildIndex >= 0 ? [] : ["build-before-deploy ordering"])
        ].join(", ")}`
  }];

  const blockers = manifest.productionReadiness?.blockers ?? [];
  const obsoleteSchemaBlockers = [
    "ribbon-sveltekit-rust-services-schema-support",
    "ribbon-react-vite-rust-services-schema-support"
  ];
  const readinessOk = Boolean(manifest.productionReadiness)
    && obsoleteSchemaBlockers.every((blocker) => !blockers.includes(blocker));
  results.push({
    id: "profile:rust-services:readiness",
    ok: readinessOk,
    detail: readinessOk
      ? manifest.productionReadiness?.ready
        ? "production readiness is true with no declared blockers"
        : `release remains fail-closed on: ${blockers.join(", ")}`
      : `remove resolved Ribbon schema blockers: ${obsoleteSchemaBlockers.filter((blocker) => blockers.includes(blocker)).join(", ")}`
  });

  return results;
}

export async function runCodexCheck(root: string): Promise<CodexCheckResult[]> {
  const results: CodexCheckResult[] = [];
  let enforceNpmApplicationDesignSystem = false;
  let manifest: ProjectManifest | undefined;
  const requiredFiles = ["package.json", "ribbon.json", ".env.example"];

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
      JSON.parse(await readFile(join(root, "ribbon.json"), "utf8"))
    );
    enforceNpmApplicationDesignSystem =
      manifest.projectType !== "control-plane"
      && manifest.framework === "vite-react";
    const designSystem = manifest.providers.designSystem;
    const requiredComponents = designSystem.version === "0.1.0"
      ? designSystem.requiredComponents
      : [];
    const designSystemManifestOk =
      designSystem.provider === "strawn" &&
      designSystem.source === "npm" &&
      designSystem.packages.join(",") === "strawn,strawn-icons" &&
      (manifest.framework === "react-vite-rust-services"
        ? designSystem.version === "0.2.0"
        : designSystem.version === "0.1.0"
          && requiredComponents.includes("ThemeProvider")
          && requiredComponents.includes("TooltipProvider"));
    results.push({
      id: "design-system:manifest",
      ok: designSystemManifestOk,
      detail: designSystemManifestOk
        ? `Strawn npm packages are pinned at ${designSystem.version}`
        : "Strawn's selected npm contract is incomplete"
    });
    const dns = manifest.providers.dns;
    if (!dns) {
      results.push({
        id: "dns:none",
        ok: true,
        detail: "using the deployment provider's default hostname; no external DNS selected"
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
      detail: error instanceof Error ? error.message : "ribbon.json is invalid"
    });
  }

  const files = await walk(root);
  const sourceFiles = files.filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
  const secretLeaks: string[] = [];

  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    const browserVariables = [...source.matchAll(/\bVITE_[A-Z0-9_]+\b/g)].map((match) => match[0]);
    const exposesServerSecret = browserVariables.some((name) =>
      /(?:SECRET|SERVICE_ACCOUNT|SERVICE_ROLE|CLOUDFLARE_API_TOKEN|HOSTINGER_(?:API_TOKEN|MAIL_API_TOKEN|MAILBOX_ID)|VERCEL_TOKEN|NETLIFY_AUTH_TOKEN)/.test(name)
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

  if (manifest?.framework === "react-vite-rust-services") {
    results.push(...await checkRustServicesArtifacts(root, manifest, files));
  }

  if (enforceNpmApplicationDesignSystem) {
  const packageJsonSource = await readFile(join(root, "package.json"), "utf8").catch(() => "{}");
  const packageJson = JSON.parse(packageJsonSource) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const npmPackagesOk =
    packageJson.dependencies?.strawn === "0.1.0" &&
    packageJson.dependencies?.["strawn-icons"] === "0.1.0";
  results.push({
    id: "design-system:packages",
    ok: npmPackagesOk,
    detail: npmPackagesOk
      ? "Strawn npm dependencies are exactly pinned at 0.1.0"
      : "package.json must pin strawn and strawn-icons at 0.1.0"
  });

  const uiSourceFiles = sourceFiles.filter((file) => {
    const path = relative(root, file).replaceAll("\\", "/");
    return path.startsWith("src/") || path === "vite.config.ts" || path === "vite.config.js";
  });
  const uiSource = (await Promise.all(uiSourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
  const requiredDesignSystemMarkers = [
    'from "strawn"',
    'from "strawn-icons"',
    "ThemeProvider",
    "TooltipProvider"
  ];
  const missingDesignSystemMarkers = requiredDesignSystemMarkers.filter(
    (marker) => !uiSource.includes(marker)
  );
  results.push({
    id: "design-system:imports",
    ok: missingDesignSystemMarkers.length === 0,
    detail: missingDesignSystemMarkers.length === 0
      ? "Strawn primitives, icons, and providers are wired"
      : `missing Strawn wiring: ${missingDesignSystemMarkers.join(", ")}`
  });

  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  });
  const prohibitedDependencies = dependencyNames.filter((dependency) =>
    /^(?:lucide-react|tailwindcss|@tailwindcss\/|@radix-ui\/|@shadcn\/)/.test(dependency)
  );
  const prohibitedOk = prohibitedDependencies.length === 0;
  results.push({
    id: "design-system:no-bypasses",
    ok: prohibitedOk,
    detail: prohibitedOk
      ? "no Tailwind, Lucide, shadcn, or direct Radix bypasses found"
      : `prohibited dependencies: ${prohibitedDependencies.join(", ")}`
  });

  } else if (manifest?.projectType === "control-plane") {
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
    const usesCloudStorage = manifest.providers.backend.storage === "cloud-storage";
    const rulesOk =
      firestoreRules.includes("request.auth.uid")
      && firestoreRules.includes("owner_id")
      && (
        usesCloudStorage
          ? storageRules.includes("request.auth.uid") && storageRules.includes("userId")
          : storageRules.length === 0
      );
    results.push({
      id: "backend:firebase:rules",
      ok: rulesOk,
      detail: rulesOk
        ? usesCloudStorage
          ? "Firestore and Storage rules enforce owner-scoped access"
          : "Firestore rules enforce owner-scoped access; Cloud Storage is disabled"
        : usesCloudStorage
          ? "owner-scoped firestore.rules and storage.rules are required"
          : "owner-scoped firestore.rules is required and unused Storage rules must be absent"
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
  if (manifest) {
    results.push({
      id: "release:workflow",
      ok: workflows.length > 0
        && releaseWorkflowSource.toLowerCase().includes(manifest.providers.deployment.provider),
      detail: workflows.length > 0
        ? `${manifest.providers.deployment.provider} release workflow found`
        : "GitHub Actions workflow missing"
    });
  }
  if (manifest?.framework === "react-vite-rust-services") {
    results.push(...await checkRustServicesRelease(root, manifest, releaseWorkflowSource));
  }
  if (manifest?.providers.deployment.provider === "netlify") {
    const requiredBuildVariables = manifest.providers.backend.provider === "supabase"
      ? ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
      : manifest.providers.backend.provider === "firebase"
        ? [
          "VITE_FIREBASE_API_KEY",
          "VITE_FIREBASE_AUTH_DOMAIN",
          "VITE_FIREBASE_PROJECT_ID",
          ...(manifest.providers.backend.storage === "cloud-storage"
            ? ["VITE_FIREBASE_STORAGE_BUCKET"]
            : []),
          "VITE_FIREBASE_APP_ID"
        ]
        : [];
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
  } else if (manifest?.providers.deployment.provider === "firebase-hosting") {
    const firebaseConfig = await readFile(join(root, "firebase.json"), "utf8").catch(() => "");
    let hostingConfigOk = false;
    try {
      const parsed = JSON.parse(firebaseConfig) as {
        hosting?: { public?: string; rewrites?: Array<{ source?: string; destination?: string }> };
      };
      hostingConfigOk =
        parsed.hosting?.public === "dist"
        && Boolean(parsed.hosting.rewrites?.some(
          (rewrite) => rewrite.source === "**" && rewrite.destination === "/index.html"
        ));
    } catch {
      hostingConfigOk = false;
    }
    results.push({
      id: "release:firebase-hosting:config",
      ok: hostingConfigOk,
      detail: hostingConfigOk
        ? "Firebase Hosting deploys the verified dist SPA"
        : "firebase.json must serve dist with an index.html SPA rewrite"
    });

    const requiredBuildVariables = manifest.providers.backend.provider === "supabase"
      ? ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
      : manifest.providers.backend.provider === "firebase"
        ? [
          "VITE_FIREBASE_API_KEY",
          "VITE_FIREBASE_AUTH_DOMAIN",
          "VITE_FIREBASE_PROJECT_ID",
          ...(manifest.providers.backend.storage === "cloud-storage"
            ? ["VITE_FIREBASE_STORAGE_BUCKET"]
            : []),
          "VITE_FIREBASE_APP_ID"
        ]
        : [];
    const requiredWorkflowMarkers = [
      ...requiredBuildVariables,
      "FIREBASE_PROJECT_ID",
      "FIREBASE_SERVICE_ACCOUNT_JSON",
      "firebase deploy",
      "--only"
    ];
    const missingWorkflowMarkers = requiredWorkflowMarkers.filter(
      (marker) => !releaseWorkflowSource.includes(marker)
    );
    results.push({
      id: "release:firebase-hosting:workflow",
      ok: missingWorkflowMarkers.length === 0,
      detail: missingWorkflowMarkers.length === 0
        ? `${manifest.providers.backend.provider} build variables and Firebase deployment credentials are wired`
        : `missing Firebase Hosting workflow markers: ${missingWorkflowMarkers.join(", ")}`
    });
  }

  return results;
}
