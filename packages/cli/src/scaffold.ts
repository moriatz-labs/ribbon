import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectManifestSchema, type ProjectManifest } from "@moriatz/ribbon-core";

export const DEFAULT_STRAWN_VERSION = "0.1.0";
export const DEFAULT_STACK = {
  dns: "hostinger",
  backend: "supabase",
  deployment: "vercel"
} as const;

export interface ScaffoldOptions {
  title?: string;
  domain?: string;
  includeDomain?: boolean;
  dnsProvider?: "hostinger" | "cloudflare";
  backendProvider?: "supabase" | "firebase";
  firebaseStorage?: "none" | "cloud-storage";
  deploymentProvider?: "vercel" | "netlify" | "firebase-hosting";
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

function findRibbonRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../../..");
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
  options: Required<Pick<
    ScaffoldOptions,
    "includeDomain" | "dnsProvider" | "backendProvider" | "firebaseStorage" | "deploymentProvider" | "mailProvider"
  >>
): ProjectManifest["providers"] {
  const hostname = `${slug}.${domain}`;
  const deployment = options.deploymentProvider === "vercel"
    ? { provider: "vercel" as const, projectName: slug, cnameTarget: "cname.vercel-dns.com" }
    : options.deploymentProvider === "netlify"
      ? {
        provider: "netlify" as const,
        siteName: slug,
        cnameTarget: `${slug}.netlify.app`
      }
      : { provider: "firebase-hosting" as const };
  const backend = options.backendProvider === "supabase"
    ? { provider: "supabase" as const }
    : { provider: "firebase" as const, projectName: slug, storage: options.firebaseStorage };
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
    ...(options.includeDomain ? { dns } : {}),
    mail,
    designSystem: {
      provider: "strawn",
      source: "npm",
      version: DEFAULT_STRAWN_VERSION,
      packages: ["strawn", "strawn-icons"],
      requiredComponents: ["ThemeProvider", "TooltipProvider"]
    }
  };
}

async function writeFirebaseConfig(
  targetPath: string,
  options: Required<Pick<ScaffoldOptions, "backendProvider" | "firebaseStorage" | "deploymentProvider">>
) {
  const config = {
    ...(options.deploymentProvider === "firebase-hosting"
      ? {
          hosting: {
            public: "dist",
            ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
            cleanUrls: true,
            rewrites: [{ source: "**", destination: "/index.html" }]
          }
        }
      : {}),
    ...(options.backendProvider === "firebase"
      ? {
          firestore: { rules: "firestore.rules" },
          ...(options.firebaseStorage === "cloud-storage"
            ? { storage: { rules: "storage.rules" } }
            : {})
        }
      : {})
  };
  const configPath = join(targetPath, "firebase.json");
  if (Object.keys(config).length === 0) {
    await rm(configPath, { force: true });
    return;
  }
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function configureProviderFiles(
  targetPath: string,
  options: Required<Pick<ScaffoldOptions, "backendProvider" | "firebaseStorage" | "deploymentProvider">>
) {
  const packagePath = join(targetPath, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    dependencies: Record<string, string>;
  };

  if (options.backendProvider === "supabase") {
    delete packageJson.dependencies.firebase;
    await Promise.all([
      rm(join(targetPath, "src", "lib", "providers", "firebase.ts"), { force: true }),
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
      rm(join(targetPath, "api"), { recursive: true, force: true }),
      cp(
        join(targetPath, "provider-templates", "ci-firebase.yml"),
        join(targetPath, ".github", "workflows", "ci.yml")
      )
    ]);
    if (options.firebaseStorage === "none") {
      await cp(
        join(targetPath, "provider-templates", "firebase-no-storage.ts"),
        join(targetPath, "src", "lib", "providers", "firebase.ts")
      );
      await Promise.all([
        rm(join(targetPath, "storage.rules"), { force: true }),
        rm(join(targetPath, "tests", "storage-rules.test.ts"), { force: true })
      ]);
    }
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
  } else if (options.deploymentProvider === "netlify") {
    await rm(join(targetPath, "vercel.json"), { force: true });
  } else {
    await Promise.all([
      rm(join(targetPath, "vercel.json"), { force: true }),
      rm(join(targetPath, "netlify.toml"), { force: true })
    ]);
  }

  await writeFirebaseConfig(targetPath, options);
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function writeEnvironmentExample(
  targetPath: string,
  slug: string,
  domain: string,
  options: Required<Pick<
    ScaffoldOptions,
    "includeDomain" | "dnsProvider" | "firebaseStorage" | "backendProvider" | "deploymentProvider" | "mailProvider"
  >>
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
        ...(options.firebaseStorage === "cloud-storage" ? ["VITE_FIREBASE_STORAGE_BUCKET="] : []),
        "VITE_FIREBASE_APP_ID="
      ];
  if (options.includeDomain) {
    lines.push(`PUBLIC_APP_URL=https://${slug}.${domain}`);
  }
  lines.push(
    "",
    "# GitHub Actions production configuration:",
    ...(options.deploymentProvider === "vercel"
      ? ["# Secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"]
      : options.deploymentProvider === "netlify"
        ? ["# Secrets: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID"]
        : [
            "# Variable: FIREBASE_PROJECT_ID",
            "# Secret: FIREBASE_SERVICE_ACCOUNT_JSON",
            "# VITE_FIREBASE_* or VITE_SUPABASE_* values are publishable GitHub Actions variables"
          ]),
    ...(options.includeDomain
      ? options.dnsProvider === "hostinger"
        ? ["# HOSTINGER_API_TOKEN", `# HOSTINGER_DOMAIN=${domain}`]
        : ["# CLOUDFLARE_API_TOKEN", "# CLOUDFLARE_ZONE_ID", `# CLOUDFLARE_DOMAIN=${domain}`]
      : []),
    ...(options.includeDomain ? [`# CUSTOM_DOMAIN=${slug}.${domain}`] : [])
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
  const includeDomain = rawOptions.includeDomain ?? true;
  const dnsProvider = rawOptions.dnsProvider ?? DEFAULT_STACK.dns;
  const backendProvider = rawOptions.backendProvider ?? DEFAULT_STACK.backend;
  const deploymentProvider = rawOptions.deploymentProvider ?? DEFAULT_STACK.deployment;
  const firebaseStorage = rawOptions.firebaseStorage
    ?? (backendProvider === "firebase" && deploymentProvider === "firebase-hosting"
      ? "none"
      : "cloud-storage");
  if (backendProvider !== "firebase" && rawOptions.firebaseStorage) {
    throw new Error("--firebase-storage can only be used with the Firebase backend.");
  }
  const mailProvider = rawOptions.mailProvider
    ?? (backendProvider === "supabase" && deploymentProvider === "vercel" ? "hostinger-mail" : "backend");
  if (backendProvider === "firebase" && mailProvider !== "backend") {
    throw new Error("Firebase scaffolds use backend-managed authentication email.");
  }
  if (deploymentProvider !== "vercel" && mailProvider === "hostinger-mail") {
    throw new Error("Hostinger Mail's generated server route currently requires the Vercel deployment adapter.");
  }
  const selected = {
    includeDomain,
    dnsProvider,
    backendProvider,
    firebaseStorage,
    deploymentProvider,
    mailProvider
  };

  const templatePath = join(findRibbonRoot(), "templates", "boilerplate");
  await cp(templatePath, targetPath, { recursive: true, errorOnExist: true, force: false });
  await mkdir(join(targetPath, "schemas"), { recursive: true });
  await cp(
    join(findRibbonRoot(), "schemas", "ribbon.schema.json"),
    join(targetPath, "schemas", "ribbon.schema.json")
  );
  await replaceInFiles(targetPath, {
    "__APP_SLUG__": slug,
    "__APP_TITLE__": rawOptions.title ?? titleFromSlug(slug),
    "__APP_DOMAIN__": `${slug}.${domain}`,
    "__BASE_DOMAIN__": domain,
    "__BACKEND_PROVIDER__": backendProvider,
    "__AUTH_DELIVERY__": mailProvider,
    "__BACKEND_BUILD_ENV__": backendProvider === "supabase"
      ? [
          "VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}",
          "          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}"
        ].join("\n")
      : [
          "VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}",
          "          VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}",
          "          VITE_FIREBASE_PROJECT_ID: ${{ vars.FIREBASE_PROJECT_ID }}",
          ...(firebaseStorage === "cloud-storage"
            ? ["          VITE_FIREBASE_STORAGE_BUCKET: ${{ vars.VITE_FIREBASE_STORAGE_BUCKET }}"]
            : []),
          "          VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}"
        ].join("\n"),
    "__FIREBASE_DEPLOY_TARGETS__": backendProvider === "firebase"
      ? firebaseStorage === "cloud-storage"
        ? "hosting,firestore:rules,storage"
        : "hosting,firestore:rules"
      : "hosting",
    "__CREATED_AT__": new Date().toISOString()
  });

  const manifestPath = join(targetPath, "ribbon.json");
  const manifestSource = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  const manifest = projectManifestSchema.parse({
    ...manifestSource,
    providers: providerManifest(slug, domain, selected)
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await configureProviderFiles(targetPath, selected);
  if (mailProvider === "backend") {
    await rm(join(targetPath, "api"), { recursive: true, force: true });
  }
  await writeEnvironmentExample(targetPath, slug, domain, selected);

  return targetPath;
}
