import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const urlSchema = z.string().url();
export const projectStatusSchema = z.enum([
  "draft",
  "local",
  "preview",
  "production",
  "archived"
]);

const vercelProviderSchema = z.object({
  provider: z.literal("vercel"),
  mode: z.literal("services").optional(),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  teamSlug: z.string().min(1).optional(),
  hostname: z.string().min(1).optional(),
  cnameTarget: z.string().min(1).default("cname.vercel-dns.com"),
  cnameTargetVerification: z.enum([
    "vercel-domain-inspect-required",
    "vercel-domain-inspected"
  ]).optional()
});

const netlifyProviderSchema = z.object({
  provider: z.literal("netlify"),
  siteId: z.string().min(1).optional(),
  siteName: z.string().min(1).optional(),
  accountSlug: z.string().min(1).optional(),
  cnameTarget: z.string().min(1).optional()
});

const firebaseHostingProviderSchema = z.object({
  provider: z.literal("firebase-hosting"),
  projectId: z.string().min(1).optional(),
  siteId: z.string().min(1).optional()
});

const supabaseProviderSchema = z.object({
  provider: z.literal("supabase"),
  projectRef: z.string().min(1).optional(),
  organizationSlug: z.string().min(1).optional(),
  region: z.string().min(1).optional()
});

const firebaseProviderSchema = z.object({
  provider: z.literal("firebase"),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  storage: z.enum(["none", "cloud-storage"]).default("cloud-storage")
});

const rustAxumProviderSchema = z.object({
  provider: z.literal("rust-axum"),
  runtime: z.literal("container"),
  entrypoint: z.string().min(1),
  identityStore: z.discriminatedUnion("provider", [
    z.object({
      provider: z.literal("json-file"),
      productionReady: z.literal(false)
    }),
    z.object({
      provider: z.literal("neo4j"),
      productionReady: z.literal(true),
      encryption: z.object({
        algorithm: z.literal("xchacha20-poly1305"),
        keyEnvironmentVariable: z.literal("GITEXPLORE_IDENTITY_ENCRYPTION_KEY"),
        required: z.literal(true)
      }),
      durableOAuthState: z.literal(true),
      durableSessions: z.literal(true)
    })
  ]),
  refreshCoordination: z.discriminatedUnion("provider", [
    z.object({
      provider: z.literal("process-local"),
      productionReady: z.literal(false)
    }),
    z.object({
      provider: z.literal("neo4j-lease"),
      productionReady: z.literal(true),
      leaseSeconds: z.number().int().min(5).max(3600)
    })
  ])
});

const neo4jAuraProviderSchema = z.object({
  provider: z.literal("neo4j-aura"),
  schema: z.string().min(1),
  migrationMode: z.enum([
    "release-gate-required",
    "release-gate",
    "release-gated-idempotent-cli"
  ])
});

const githubOAuthProviderSchema = z.object({
  provider: z.literal("github-oauth"),
  callbackPath: z.string().startsWith("/")
});

const hostingerDnsProviderSchema = z.object({
  provider: z.literal("hostinger"),
  domain: z.string().min(1),
  hostname: z.string().min(1),
  ttl: z.number().int().min(300).max(86400).default(300)
}).refine(
  ({ domain, hostname }) => hostname.endsWith(`.${domain}`),
  { message: "Hostinger hostname must be a subdomain of its DNS domain." }
);

const cloudflareDnsProviderSchema = z.object({
  provider: z.literal("cloudflare"),
  zoneId: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  hostname: z.string().min(1).optional(),
  ttl: z.number().int().min(60).max(86400).default(300),
  proxied: z.literal(false).default(false)
}).refine(
  ({ domain, hostname }) => !domain || !hostname || hostname.endsWith(`.${domain}`),
  { message: "Cloudflare hostname must be a subdomain of its DNS domain." }
);

const mailProviderSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("hostinger-mail"),
    apiTokenEnv: z.literal("HOSTINGER_MAIL_API_TOKEN"),
    mailboxIdEnv: z.literal("HOSTINGER_MAILBOX_ID"),
    fromEnv: z.literal("HOSTINGER_MAIL_FROM")
  }),
  z.object({ provider: z.literal("backend") })
]);

const strawnPackageNamesSchema = z.tuple([
  z.literal("strawn"),
  z.literal("strawn-icons")
]);

const designSystemProviderSchema = z.discriminatedUnion("version", [
  z.object({
    provider: z.literal("strawn"),
    source: z.literal("npm"),
    version: z.literal("0.1.0"),
    packages: strawnPackageNamesSchema,
    requiredComponents: z.array(z.string().min(1)).refine(
      (components) =>
        components.includes("ThemeProvider") && components.includes("TooltipProvider"),
      { message: "Ribbon projects must require Strawn's ThemeProvider and TooltipProvider." }
    )
  }),
  z.object({
    provider: z.literal("strawn"),
    source: z.literal("npm"),
    version: z.literal("0.2.0"),
    packages: strawnPackageNamesSchema
  })
]);

const providersSchema = z.object({
  deployment: z.discriminatedUnion("provider", [
    vercelProviderSchema,
    netlifyProviderSchema,
    firebaseHostingProviderSchema
  ]),
  backend: z.discriminatedUnion("provider", [
    supabaseProviderSchema,
    firebaseProviderSchema,
    rustAxumProviderSchema
  ]),
  graph: neo4jAuraProviderSchema.optional(),
  auth: githubOAuthProviderSchema.optional(),
  dns: z.discriminatedUnion("provider", [hostingerDnsProviderSchema, cloudflareDnsProviderSchema]).optional(),
  mail: mailProviderSchema.optional(),
  designSystem: designSystemProviderSchema
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateLegacyManifest(input: unknown) {
  if (!isRecord(input) || !isRecord(input.providers)) return input;
  const providers = input.providers;
  if (providers.deployment || providers.backend || providers.dns) return input;

  const vercel = isRecord(providers.vercel) ? providers.vercel : {};
  const supabase = isRecord(providers.supabase) ? providers.supabase : {};
  const hostinger = isRecord(providers.hostinger) ? providers.hostinger : undefined;
  const cloudflare = isRecord(providers.cloudflare) ? providers.cloudflare : undefined;
  const legacyMail = hostinger && isRecord(hostinger.mail) ? hostinger.mail : undefined;

  const dns = hostinger
    ? { provider: "hostinger", domain: hostinger.domain, hostname: hostinger.hostname, ttl: hostinger.ttl }
    : cloudflare
      ? {
          provider: "cloudflare",
          zoneId: cloudflare.zoneId,
          domain: cloudflare.domain,
          hostname: cloudflare.hostname,
          proxied: false
        }
      : undefined;

  return {
    ...input,
    manifestVersion: 2,
    providers: {
      deployment: { provider: "vercel", ...vercel },
      backend: { provider: "supabase", ...supabase },
      ...(dns ? { dns } : {}),
      ...(legacyMail ? { mail: legacyMail } : {}),
      designSystem: providers.designSystem
    }
  };
}

const environmentNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

const runtimeEnvironmentSchema = z.object({
  public: z.array(environmentNameSchema),
  server: z.array(environmentNameSchema)
}).superRefine(({ public: publicNames, server: serverNames }, context) => {
  const allNames = [...publicNames, ...serverNames];
  if (new Set(allNames).size !== allNames.length) {
    context.addIssue({
      code: "custom",
      message: "Runtime environment variable names must be unique."
    });
  }
  for (const [index, name] of publicNames.entries()) {
    if (!name.startsWith("PUBLIC_")) {
      context.addIssue({
        code: "custom",
        path: ["public", index],
        message: "Browser-visible runtime variables must use the PUBLIC_ prefix."
      });
    }
    if (/(?:SECRET|PASSWORD|TOKEN|PRIVATE|ENCRYPTION_KEY)/.test(name)) {
      context.addIssue({
        code: "custom",
        path: ["public", index],
        message: "Server credentials cannot be browser-visible."
      });
    }
  }
});

const productionReadinessSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(slugSchema)
}).superRefine(({ ready, blockers }, context) => {
  if (ready && blockers.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["blockers"],
      message: "A production-ready project cannot retain blockers."
    });
  }
  if (!ready && blockers.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["blockers"],
      message: "A project that is not production-ready must name at least one blocker."
    });
  }
});

const canonicalProjectManifestSchema = z.object({
  manifestVersion: z.literal(2).default(2),
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().default(""),
  framework: z.enum(["vite-react", "react-vite-rust-services"]),
  projectType: z.enum(["application", "control-plane"]).optional(),
  providers: providersSchema,
  urls: z.object({
    local: urlSchema.optional(),
    preview: urlSchema.optional(),
    production: urlSchema.optional(),
    backend: urlSchema.optional(),
    supabase: urlSchema.optional(),
    repository: urlSchema.optional()
  }),
  status: projectStatusSchema,
  runtimeEnvironment: runtimeEnvironmentSchema.optional(),
  productionReadiness: productionReadinessSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
}).superRefine((manifest, context) => {
  const issue = (path: PropertyKey[], message: string) => {
    context.addIssue({ code: "custom", path, message });
  };

  if (manifest.projectType === "control-plane" && manifest.slug !== "ribbon") {
    issue(["projectType"], "Only the Ribbon repository may declare itself as the control plane.");
  }
  if (manifest.providers.backend.provider === "firebase" && manifest.providers.mail?.provider === "hostinger-mail") {
    issue(["providers", "mail"], "Firebase scaffolds use backend-managed authentication email.");
  }

  const isRustServices = manifest.framework === "react-vite-rust-services";
  if (!isRustServices) {
    if (manifest.providers.backend.provider === "rust-axum") {
      issue(["providers", "backend"], "The Rust/Axum backend is limited to the React/Vite services profile.");
    }
    if (manifest.providers.deployment.provider === "vercel" && manifest.providers.deployment.mode === "services") {
      issue(["providers", "deployment", "mode"], "Vercel Services mode requires the React/Vite services profile.");
    }
    if (manifest.providers.graph || manifest.providers.auth) {
      issue(["providers"], "Graph and OAuth slots are limited to the React/Vite services profile.");
    }
    if (manifest.providers.designSystem.version !== "0.1.0") {
      issue(
        ["providers", "designSystem", "version"],
        "Generic Vite/React scaffolds use the Strawn 0.1.0 npm contract."
      );
    }
    if (manifest.runtimeEnvironment || manifest.productionReadiness) {
      issue([], "Runtime environment and production readiness declarations belong to the React/Vite services profile.");
    }
    return;
  }

  if (manifest.projectType !== "application") {
    issue(["projectType"], "The React/Vite services profile must declare projectType application.");
  }
  const deployment = manifest.providers.deployment;
  if (deployment.provider !== "vercel" || deployment.mode !== "services") {
    issue(["providers", "deployment"], "The React/Vite services profile requires Vercel Services mode.");
  } else {
    if (!deployment.hostname) {
      issue(["providers", "deployment", "hostname"], "Vercel Services requires the application hostname.");
    }
    if (!deployment.cnameTargetVerification) {
      issue(
        ["providers", "deployment", "cnameTargetVerification"],
        "Vercel's project-specific CNAME must be inspected before DNS mutation."
      );
    }
  }

  const backend = manifest.providers.backend;
  if (backend.provider !== "rust-axum") {
    issue(["providers", "backend"], "The React/Vite services profile requires the Rust/Axum container backend.");
  }
  if (manifest.providers.graph?.provider !== "neo4j-aura") {
    issue(["providers", "graph"], "The React/Vite services profile requires the Neo4j Aura graph slot.");
  }
  if (manifest.providers.auth?.provider !== "github-oauth") {
    issue(["providers", "auth"], "The React/Vite services profile requires the GitHub OAuth slot.");
  }
  if (manifest.providers.designSystem.version !== "0.2.0") {
    issue(
      ["providers", "designSystem", "version"],
      "The React/Vite services profile requires the Strawn 0.2.0 npm contract."
    );
  }

  const runtimeEnvironment = manifest.runtimeEnvironment;
  if (!runtimeEnvironment) {
    issue(["runtimeEnvironment"], "The React/Vite services profile must declare runtime variable names.");
  } else {
    const requiredServer = [
      "GITEXPLORE_FRONTEND_ORIGIN",
      "GITEXPLORE_GITHUB_CLIENT_ID",
      "GITEXPLORE_GITHUB_CLIENT_SECRET",
      "GITEXPLORE_GITHUB_REDIRECT_URI",
      "GITEXPLORE_GITHUB_SCOPES",
      "GITEXPLORE_GRAPH_BACKEND",
      "GITEXPLORE_DEPLOYMENT_MODE",
      "GITEXPLORE_NEO4J_URI",
      "GITEXPLORE_NEO4J_USERNAME",
      "GITEXPLORE_NEO4J_PASSWORD",
      "GITEXPLORE_NEO4J_DATABASE",
      "GITEXPLORE_NEO4J_MAX_TOTAL_NODES",
      "GITEXPLORE_NEO4J_MAX_TOTAL_RELATIONSHIPS"
    ];
    if (backend.provider === "rust-axum" && backend.identityStore.provider === "neo4j") {
      requiredServer.push(backend.identityStore.encryption.keyEnvironmentVariable);
    }
    if (runtimeEnvironment.public.length > 0) {
      issue(
        ["runtimeEnvironment", "public"],
        "The same-origin React/Vite services profile must not expose browser runtime variables."
      );
    }
    for (const name of requiredServer) {
      if (!runtimeEnvironment.server.includes(name)) {
        issue(["runtimeEnvironment", "server"], `Missing server runtime variable ${name}.`);
      }
    }
  }

  const readiness = manifest.productionReadiness;
  if (!readiness) {
    issue(["productionReadiness"], "The React/Vite services profile must declare production readiness.");
    return;
  }
  if (
    readiness.ready
    && deployment.provider === "vercel"
    && deployment.cnameTargetVerification !== "vercel-domain-inspected"
  ) {
    issue(
      ["providers", "deployment", "cnameTargetVerification"],
      "Production readiness requires an inspected Vercel project CNAME."
    );
  }
  if (backend.provider === "rust-axum") {
    if (!backend.identityStore.productionReady) {
      for (const blocker of ["durable-identity-and-session-store", "distributed-oauth-state"]) {
        if (!readiness.blockers.includes(blocker)) {
          issue(
            ["productionReadiness", "blockers"],
            `The non-durable identity store requires the ${blocker} blocker.`
          );
        }
      }
    }
    if (!backend.refreshCoordination.productionReady && !readiness.blockers.includes("distributed-refresh-coordination")) {
      issue(
        ["productionReadiness", "blockers"],
        "Process-local refresh coordination requires the distributed-refresh-coordination blocker."
      );
    }
    if (readiness.ready && (!backend.identityStore.productionReady || !backend.refreshCoordination.productionReady)) {
      issue(["productionReadiness", "ready"], "Production requires durable identity and refresh coordination.");
    }
  }
  const graph = manifest.providers.graph;
  if (graph?.migrationMode === "release-gate-required") {
    if (!readiness.blockers.includes("neo4j-aura-schema-migration-gate")) {
      issue(
        ["productionReadiness", "blockers"],
        "An unimplemented Aura migration gate requires the neo4j-aura-schema-migration-gate blocker."
      );
    }
    if (readiness.ready) {
      issue(["productionReadiness", "ready"], "Production requires an implemented Neo4j migration gate.");
    }
  }
});

export const projectManifestSchema = z.preprocess(
  migrateLegacyManifest,
  canonicalProjectManifestSchema
);

export type ProjectManifest = z.infer<typeof projectManifestSchema>;
export type DeploymentProviderConfig = ProjectManifest["providers"]["deployment"];
export type BackendProviderConfig = ProjectManifest["providers"]["backend"];
export type DnsProviderConfig = NonNullable<ProjectManifest["providers"]["dns"]>;

export function deploymentCnameTarget(provider: DeploymentProviderConfig) {
  if (provider.provider === "vercel") return provider.cnameTarget;
  if (provider.provider === "netlify") {
    return provider.cnameTarget ?? (provider.siteName ? `${provider.siteName}.netlify.app` : undefined);
  }
  return undefined;
}

export const registrySchema = z.object({
  version: z.literal(1),
  projects: z.array(projectManifestSchema)
});

export type Registry = z.infer<typeof registrySchema>;
