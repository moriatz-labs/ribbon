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

const providersSchema = z.object({
  vercel: z.object({
    projectId: z.string().min(1).optional(),
    projectName: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
    teamSlug: z.string().min(1).optional()
  }),
  supabase: z.object({
    projectRef: z.string().min(1).optional(),
    organizationSlug: z.string().min(1).optional(),
    region: z.string().min(1).optional()
  }),
  cloudflare: z.object({
    zoneId: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    proxied: z.literal(false).default(false)
  }).optional(),
  hostinger: z.object({
    domain: z.string().min(1),
    hostname: z.string().min(1),
    ttl: z.number().int().min(300).max(86400).default(300),
    mail: z.object({
      provider: z.literal("hostinger-mail"),
      apiTokenEnv: z.literal("HOSTINGER_MAIL_API_TOKEN"),
      mailboxIdEnv: z.literal("HOSTINGER_MAILBOX_ID"),
      fromEnv: z.literal("HOSTINGER_MAIL_FROM")
    }).optional()
  }).refine(
    ({ domain, hostname }) => hostname.endsWith(`.${domain}`),
    { message: "Hostinger hostname must be a subdomain of its DNS domain." }
  ).optional(),
  designSystem: z.object({
    source: z.string().min(1),
    repository: z.string().url(),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
    packages: z.tuple([
      z.literal("@paul/ui-core"),
      z.literal("@paul/ui-icons"),
      z.literal("@paul/ui-patterns"),
      z.literal("@paul/ui-tokens"),
      z.literal("@paul/ui-themes")
    ]),
    requiredComponents: z.array(z.string().min(1)).refine(
      (components) => components.includes("DatePicker"),
      { message: "VSCD projects must require Paul's DatePicker for date fields." }
    )
  })
}).refine(
  (providers) => Boolean(providers.cloudflare || providers.hostinger),
  { message: "Configure either Cloudflare or Hostinger as the DNS provider." }
);

export const projectManifestSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().default(""),
  framework: z.literal("vite-react"),
  providers: providersSchema,
  urls: z.object({
    local: urlSchema.optional(),
    preview: urlSchema.optional(),
    production: urlSchema.optional(),
    supabase: urlSchema.optional(),
    repository: urlSchema.optional()
  }),
  status: projectStatusSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type ProjectManifest = z.infer<typeof projectManifestSchema>;

export const registrySchema = z.object({
  version: z.literal(1),
  projects: z.array(projectManifestSchema)
});

export type Registry = z.infer<typeof registrySchema>;

