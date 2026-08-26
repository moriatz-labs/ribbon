export type ProviderCapability = "dns" | "backend" | "graph" | "auth" | "deployment" | "mail";

export interface ProviderDefinition {
  id: string;
  capability: ProviderCapability;
  displayName: string;
  description: string;
  requiredEnvironment: readonly string[];
  optionalEnvironment?: readonly string[];
  validationOnly?: boolean;
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
      description: "Firebase Auth and Firestore, with optional Blaze-only Cloud Storage.",
      requiredEnvironment: [
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_APP_ID"
      ],
      optionalEnvironment: ["VITE_FIREBASE_STORAGE_BUCKET"]
    },
    {
      id: "rust-axum",
      capability: "backend",
      displayName: "Rust/Axum container",
      description: "Validation-only backend for the GitExplore React/Vite and Vercel Services profile.",
      requiredEnvironment: ["GITEXPLORE_FRONTEND_ORIGIN", "GITEXPLORE_GRAPH_BACKEND"],
      validationOnly: true
    }
  ],
  graph: [
    {
      id: "neo4j-aura",
      capability: "graph",
      displayName: "Neo4j Aura",
      description: "Validation-only managed graph slot for the GitExplore application profile.",
      requiredEnvironment: [
        "GITEXPLORE_NEO4J_URI",
        "GITEXPLORE_NEO4J_USERNAME",
        "GITEXPLORE_NEO4J_PASSWORD",
        "GITEXPLORE_NEO4J_DATABASE"
      ],
      validationOnly: true
    }
  ],
  auth: [
    {
      id: "github-oauth",
      capability: "auth",
      displayName: "GitHub OAuth",
      description: "Validation-only OAuth slot for the GitExplore application profile.",
      requiredEnvironment: [
        "GITEXPLORE_GITHUB_CLIENT_ID",
        "GITEXPLORE_GITHUB_CLIENT_SECRET",
        "GITEXPLORE_GITHUB_REDIRECT_URI"
      ],
      optionalEnvironment: ["GITEXPLORE_GITHUB_SCOPES"],
      validationOnly: true
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
    },
    {
      id: "firebase-hosting",
      capability: "deployment",
      displayName: "Firebase Hosting",
      description: "Static Firebase Hosting deployments through GitHub Actions.",
      requiredEnvironment: ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON"]
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

export function getProviderDefinition(capability: ProviderCapability, id: string): ProviderDefinition {
  const definition = providerCatalog[capability].find((candidate) => candidate.id === id);
  if (!definition) {
    const supported = providerCatalog[capability].map((candidate) => candidate.id).join(", ");
    throw new Error(`Unknown ${capability} provider "${id}". Supported providers: ${supported}.`);
  }
  return definition;
}

