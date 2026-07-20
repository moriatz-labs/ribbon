import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { projectManifestSchema, type ProjectManifest } from "@vscd/core";

export const DEFAULT_DESIGN_SYSTEM_COMMIT = "ecd03637e6cb5f2422169d02cae234760ccb887d";
export const DEFAULT_STACK = {
  dns: "hostinger",
  backend: "supabase",
  deployment: "vercel"
} as const;

export interface ScaffoldOptions {
  title?: string;
  domain?: string;
  dnsProvider?: "hostinger" | "cloudflare";
  backendProvider?: "supabase" | "firebase";
  deploymentProvider?: "vercel" | "netlify";
  mailProvider?: "hostinger-mail" | "backend";
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function replaceInFiles(path: string, replacements: Record<string, string>) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await replaceInFiles(fullPath, replacements);
      continue;
    }

    if (/\.(?:json|md|ts|tsx|css|html|toml|sql|yaml|yml|example)$/.test(entry.name)) {
      let content = await readFile(fullPath, "utf8");
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replaceAll(placeholder, value);
      }
      await writeFile(fullPath, content, "utf8");
    }
  }
}

function findVscdRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../../..");
}

function designSystemSourceForManifest(targetPath: string) {
  const configuredSource = process.env.DESIGN_SYSTEM_SOURCE;
  if (!configuredSource) return "../design-system";

  const relativeSource = relative(resolve(targetPath), resolve(configuredSource));
  if (!relativeSource) return ".";

  const portableSource = relativeSource.split(sep).join("/");
  return portableSource.startsWith(".") ? portableSource : `./${portableSource}`;
}

function normalizeOptions(titleOrOptions?: string | ScaffoldOptions, legacyDomain?: string): ScaffoldOptions {
  if (typeof titleOrOptions === "string" || legacyDomain) {
    return { title: titleOrOptions as string | undefined, domain: legacyDomain };
  }
  return titleOrOptions ?? {};
}

function providerManifest(
  slug: string,
  domain: string,
  options: Required<Pick<ScaffoldOptions, "dnsProvider" | "backendProvider" | "deploymentProvider" | "mailProvider">>
): ProjectManifest["providers"] {
  const hostname = `${slug}.${domain}`;
  const deployment = options.deploymentProvider === "vercel"
    ? { provider: "vercel" as const, projectName: slug, cnameTarget: "cname.vercel-dns.com" }
    : {
        provider: "netlify" as const,
        siteName: slug,
        cnameTarget: `${slug}.netlify.app`
      };
  const backend = options.backendProvider === "supabase"
    ? { provider: "supabase" as const }
    : { provider: "firebase" as const, projectName: slug };
  const dns = options.dnsProvider === "hostinger"
    ? { provider: "hostinger" as const, domain, hostname, ttl: 300 }
    : {
        provider: "cloudflare" as const,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        domain,
        hostname,
        ttl: 300,
        proxied: false as const
      };
  const mail = options.mailProvider === "hostinger-mail"
    ? {
        provider: "hostinger-mail" as const,
        apiTokenEnv: "HOSTINGER_MAIL_API_TOKEN" as const,
        mailboxIdEnv: "HOSTINGER_MAILBOX_ID" as const,
        fromEnv: "HOSTINGER_MAIL_FROM" as const
      }
    : { provider: "backend" as const };

  return {
    deployment,
    backend,
    dns,
    mail,
    designSystem: {
      source: "../design-system",
      repository: "https://github.com/Paul-M-Kallarackal/design-system",
      commit: DEFAULT_DESIGN_SYSTEM_COMMIT,
      packages: [
        "@paul/ui-core",
        "@paul/ui-icons",
        "@paul/ui-patterns",
        "@paul/ui-tokens",
        "@paul/ui-themes"
      ],
      requiredComponents: ["DatePicker"]
    }
  };
}

async function configureProviderFiles(
  targetPath: string,
  options: Required<Pick<ScaffoldOptions, "backendProvider" | "deploymentProvider">>
) {
  const packagePath = join(targetPath, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    dependencies: Record<string, string>;
  };

  if (options.backendProvider === "supabase") {
    delete packageJson.dependencies.firebase;
    await Promise.all([
      rm(join(targetPath, "src", "lib", "providers", "firebase.ts"), { force: true }),
      rm(join(targetPath, "firebase.json"), { force: true }),
      rm(join(targetPath, "firestore.rules"), { force: true }),
      rm(join(targetPath, "storage.rules"), { force: true }),
      rm(join(targetPath, "tests", "firebase-rules.test.ts"), { force: true })
    ]);
    await rm(join(targetPath, "tests"), { recursive: true, force: true });
  } else {
    delete packageJson.dependencies["@supabase/supabase-js"];
    await Promise.all([
      rm(join(targetPath, "src", "lib", "providers", "supabase.ts"), { force: true }),
      rm(join(targetPath, "supabase"), { recursive: true, force: true }),
      rm(join(targetPath, "api"), { recursive: true, force: true })
    ]);
  }

  const workflowSource = join(
    targetPath,
    "provider-templates",
    `release-${options.deploymentProvider}.yml`
  );
  await cp(workflowSource, join(targetPath, ".github", "workflows", "release.yml"));
  await rm(join(targetPath, "provider-templates"), { recursive: true, force: true });
  if (options.deploymentProvider === "vercel") {
    await rm(join(targetPath, "netlify.toml"), { force: true });
  } else {
    await rm(join(targetPath, "vercel.json"), { force: true });
  }

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function writeEnvironmentExample(
  targetPath: string,
  slug: string,
  domain: string,
  options: Required<Pick<ScaffoldOptions, "dnsProvider" | "backendProvider" | "deploymentProvider" | "mailProvider">>
) {
  const lines = options.backendProvider === "supabase"
    ? [
        "VITE_SUPABASE_URL=",
        "VITE_SUPABASE_PUBLISHABLE_KEY=",
        ...(options.mailProvider === "hostinger-mail"
          ? [
              "SUPABASE_URL=",
              "SUPABASE_SERVICE_ROLE_KEY=",
              "HOSTINGER_MAIL_API_TOKEN=",
              "HOSTINGER_MAILBOX_ID=",
              "HOSTINGER_MAIL_FROM="
            ]
          : [])
      ]
    : [
        "VITE_FIREBASE_API_KEY=",
        "VITE_FIREBASE_AUTH_DOMAIN=",
        "VITE_FIREBASE_PROJECT_ID=",
        "VITE_FIREBASE_STORAGE_BUCKET=",
        "VITE_FIREBASE_APP_ID="
      ];
  lines.push(
    `PUBLIC_APP_URL=https://${slug}.${domain}`,
    `DESIGN_SYSTEM_COMMIT=${DEFAULT_DESIGN_SYSTEM_COMMIT}`,
    "",
    "# GitHub Actions secrets, never browser variables:",
    ...(options.deploymentProvider === "vercel"
      ? ["# VERCEL_TOKEN", "# VERCEL_ORG_ID", "# VERCEL_PROJECT_ID"]
      : ["# NETLIFY_AUTH_TOKEN", "# NETLIFY_SITE_ID"]),
    "# DESIGN_SYSTEM_DEPLOY_KEY is server-only; never prefix it with VITE_.",
    ...(options.dnsProvider === "hostinger"
      ? ["# HOSTINGER_API_TOKEN", `# HOSTINGER_DOMAIN=${domain}`]
      : ["# CLOUDFLARE_API_TOKEN", "# CLOUDFLARE_ZONE_ID", `# CLOUDFLARE_DOMAIN=${domain}`]),
    `# CUSTOM_DOMAIN=${slug}.${domain}`
  );
  await writeFile(join(targetPath, ".env.example"), `${lines.join("\n")}\n`, "utf8");
}

export async function scaffoldProject(
  slug: string,
  targetPath: string,
  titleOrOptions?: string | ScaffoldOptions,
  legacyDomain?: string
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Project slug must use lowercase letters, digits, and hyphens.");
  }

  const rawOptions = normalizeOptions(titleOrOptions, legacyDomain);
  const domain = rawOptions.domain ?? "moriatz.com";
  const dnsProvider = rawOptions.dnsProvider ?? DEFAULT_STACK.dns;
  const backendProvider = rawOptions.backendProvider ?? DEFAULT_STACK.backend;
  const deploymentProvider = rawOptions.deploymentProvider ?? DEFAULT_STACK.deployment;
  const mailProvider = rawOptions.mailProvider
    ?? (backendProvider === "supabase" && deploymentProvider === "vercel" ? "hostinger-mail" : "backend");
  if (backendProvider === "firebase" && mailProvider !== "backend") {
    throw new Error("Firebase scaffolds use backend-managed authentication email.");
  }
  if (deploymentProvider === "netlify" && mailProvider === "hostinger-mail") {
    throw new Error("Hostinger Mail's generated server route currently requires the Vercel deployment adapter.");
  }
  const selected = { dnsProvider, backendProvider, deploymentProvider, mailProvider };

  const templatePath = join(findVscdRoot(), "templates", "crud-app");
  await cp(templatePath, targetPath, { recursive: true, errorOnExist: true, force: false });
  await replaceInFiles(targetPath, {
    "__APP_SLUG__": slug,
    "__APP_TITLE__": rawOptions.title ?? titleFromSlug(slug),
    "__APP_DOMAIN__": `${slug}.${domain}`,
    "__BASE_DOMAIN__": domain,
    "__BACKEND_PROVIDER__": backendProvider,
    "__AUTH_DELIVERY__": mailProvider,
    "__DESIGN_SYSTEM_COMMIT__": DEFAULT_DESIGN_SYSTEM_COMMIT,
    "__DESIGN_SYSTEM_SOURCE__": designSystemSourceForManifest(targetPath),
    "__CREATED_AT__": new Date().toISOString()
  });

  const manifestPath = join(targetPath, "vscd.json");
  const manifestSource = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  const manifest = projectManifestSchema.parse({
    ...manifestSource,
    providers: providerManifest(slug, domain, selected)
  });
  manifest.providers.designSystem.source = designSystemSourceForManifest(targetPath);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await configureProviderFiles(targetPath, selected);
  if (mailProvider === "backend") {
    await rm(join(targetPath, "api"), { recursive: true, force: true });
  }
  await writeEnvironmentExample(targetPath, slug, domain, selected);

  return targetPath;
}
