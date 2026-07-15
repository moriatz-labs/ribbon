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

export const projectManifestSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  description: z.string().default(""),
  framework: z.literal("vite-react"),
  providers: z.object({
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
    }),
    designSystem: z.object({
      source: z.string().min(1),
      version: z.string().min(1).optional()
    })
  }),
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

