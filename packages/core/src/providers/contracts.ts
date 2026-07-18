export type ProviderCapability = "dns" | "backend" | "deployment" | "mail";

export interface ProviderDefinition {
  id: string;
  capability: ProviderCapability;
  displayName: string;
  description: string;
  requiredEnvironment: readonly string[];
  optionalEnvironment?: readonly string[];
}

export interface DnsProvisionInput {
  domain: string;
  hostname: string;
  target: string;
  ttl: number;
}

export interface DnsProvisionResult {
  provider: "hostinger" | "cloudflare";
  changed: boolean;
  hostname: string;
  target: string;
  recordId?: string;
  record: unknown;
}

export interface DnsProviderAdapter {
  readonly id: DnsProvisionResult["provider"];
  upsertCname(input: DnsProvisionInput): Promise<DnsProvisionResult>;
}

export const providerCatalog = {
  dns: [
    {
      id: "hostinger",
      capability: "dns",
      displayName: "Hostinger DNS",
      description: "Conflict-safe authoritative DNS updates through Hostinger.",
      requiredEnvironment: ["HOSTINGER_API_TOKEN", "HOSTINGER_DOMAIN"]
    },
    {
      id: "cloudflare",
      capability: "dns",
      displayName: "Cloudflare DNS",
      description: "DNS-only CNAME management through a zone-scoped API token.",
      requiredEnvironment: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_DOMAIN"]
    }
  ],
  backend: [
    {
      id: "supabase",
      capability: "backend",
      displayName: "Supabase",
      description: "Postgres, Auth, Storage, migrations, and row-level security.",
      requiredEnvironment: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
    },
    {
      id: "firebase",
      capability: "backend",
      displayName: "Firebase",
      description: "Firebase Auth, Firestore, and Cloud Storage with security rules.",
      requiredEnvironment: [
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_STORAGE_BUCKET",
        "VITE_FIREBASE_APP_ID"
      ]
    }
  ],
  deployment: [
    {
      id: "vercel",
      capability: "deployment",
      displayName: "Vercel",
      description: "Prebuilt Vercel deployments promoted through GitHub Actions.",
      requiredEnvironment: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]
    },
    {
      id: "netlify",
      capability: "deployment",
      displayName: "Netlify",
      description: "Production Netlify deployments through GitHub Actions.",
      requiredEnvironment: ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"]
    }
  ],
  mail: [
    {
      id: "hostinger-mail",
      capability: "mail",
      displayName: "Hostinger Mail",
      description: "Server-side transactional delivery through a Hostinger mailbox.",
      requiredEnvironment: ["HOSTINGER_MAIL_API_TOKEN", "HOSTINGER_MAILBOX_ID", "HOSTINGER_MAIL_FROM"]
    },
    {
      id: "backend",
      capability: "mail",
      displayName: "Backend-managed email",
      description: "Use the selected backend provider's built-in authentication email delivery.",
      requiredEnvironment: []
    }
  ]
} as const satisfies Record<ProviderCapability, readonly ProviderDefinition[]>;

export function listProviderDefinitions(capability?: ProviderCapability) {
  if (capability) return [...providerCatalog[capability]];
  return Object.values(providerCatalog).flat();
}

export function getProviderDefinition(capability: ProviderCapability, id: string) {
  const definition = providerCatalog[capability].find((candidate) => candidate.id === id);
  if (!definition) {
    const supported = providerCatalog[capability].map((candidate) => candidate.id).join(", ");
    throw new Error(`Unknown ${capability} provider "${id}". Supported providers: ${supported}.`);
  }
  return definition;
}

