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
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  teamSlug: z.string().min(1).optional(),
  cnameTarget: z.string().min(1).default("cname.vercel-dns.com")
});

const netlifyProviderSchema = z.object({
  provider: z.literal("netlify"),
  siteId: z.string().min(1).optional(),
  siteName: z.string().min(1).optional(),
  accountSlug: z.string().min(1).optional(),
  cnameTarget: z.string().min(1).optional()
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
  region: z.string().min(1).optional()
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

const designSystemProviderSchema = z.object({
  provider: z.literal("strawn"),
  source: z.literal("npm"),
  version: z.literal("0.1.0"),
  packages: z.tuple([
    z.literal("strawn"),
    z.literal("strawn-icons")
  ]),
  requiredComponents: z.array(z.string().min(1)).refine(
    (components) =>
      components.includes("ThemeProvider") && components.includes("TooltipProvider"),
    { message: "Ribbon projects must require Strawn's ThemeProvider and TooltipProvider." }
  )
});

const providersSchema = z.object({
  deployment: z.discriminatedUnion("provider", [vercelProviderSchema, netlifyProviderSchema]),
  backend: z.discriminatedUnion("provider", [supabaseProviderSchema, firebaseProviderSchema]),
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

const canonicalProjectManifestSchema = z.object({
  manifestVersion: z.literal(2).default(2),
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().default(""),
  framework: z.literal("vite-react"),
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
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
}).superRefine((manifest, context) => {
  if (manifest.projectType === "control-plane" && manifest.slug !== "ribbon") {
    context.addIssue({
      code: "custom",
      path: ["projectType"],
      message: "Only the Ribbon repository may declare itself as the control plane."
    });
  }
  if (manifest.providers.backend.provider === "firebase" && manifest.providers.mail?.provider === "hostinger-mail") {
    context.addIssue({
      code: "custom",
      path: ["providers", "mail"],
      message: "Firebase scaffolds use backend-managed authentication email."
    });
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
  return provider.cnameTarget ?? (provider.siteName ? `${provider.siteName}.netlify.app` : undefined);
}

export const registrySchema = z.object({
  version: z.literal(1),
  projects: z.array(projectManifestSchema)
});

export type Registry = z.infer<typeof registrySchema>;

