import { describe, expect, it } from "vitest";
import {
  getProviderDefinition,
  projectManifestSchema,
  type ProjectManifest
} from "../src/index.js";

const runtimeEnvironment = {
  public: [],
  server: [
    "GITEXPLORE_FRONTEND_ORIGIN",
    "GITEXPLORE_GITHUB_CLIENT_ID",
    "GITEXPLORE_GITHUB_CLIENT_SECRET",
    "GITEXPLORE_GITHUB_REDIRECT_URI",
    "GITEXPLORE_GITHUB_SCOPES",
    "GITEXPLORE_GRAPH_BACKEND",
    "GITEXPLORE_DEPLOYMENT_MODE",
    "GITEXPLORE_IDENTITY_ENCRYPTION_KEY",
    "GITEXPLORE_NEO4J_URI",
    "GITEXPLORE_NEO4J_USERNAME",
    "GITEXPLORE_NEO4J_PASSWORD",
    "GITEXPLORE_NEO4J_DATABASE",
    "GITEXPLORE_NEO4J_MAX_TOTAL_NODES",
    "GITEXPLORE_NEO4J_MAX_TOTAL_RELATIONSHIPS"
  ]
};

const localProfile = {
  manifestVersion: 2,
  name: "GitExplore",
  slug: "gitexplore",
  description: "GitHub graph explorer",
  framework: "react-vite-rust-services",
  projectType: "application",
  providers: {
    deployment: {
      provider: "vercel",
      mode: "services",
      projectName: "gitexplore",
      hostname: "gitexplore.moriatz.com",
      cnameTarget: "cname.vercel-dns-0.com",
      cnameTargetVerification: "vercel-domain-inspect-required"
    },
    backend: {
      provider: "rust-axum",
      runtime: "container",
      entrypoint: "Dockerfile.vercel",
      identityStore: { provider: "json-file", productionReady: false },
      refreshCoordination: { provider: "process-local", productionReady: false }
    },
    graph: {
      provider: "neo4j-aura",
      schema: "docker/neo4j/init/01-schema.cypher",
      migrationMode: "release-gate-required"
    },
    auth: {
      provider: "github-oauth",
      callbackPath: "/auth/oauth/callback"
    },
    dns: {
      provider: "hostinger",
      domain: "moriatz.com",
      hostname: "gitexplore.moriatz.com",
      ttl: 300
    },
    designSystem: {
      provider: "strawn",
      source: "npm",
      version: "0.2.0",
      packages: ["strawn", "strawn-icons"]
    }
  },
  runtimeEnvironment,
  urls: { local: "http://localhost:3000" },
  status: "local",
  productionReadiness: {
    ready: false,
    blockers: [
      "durable-identity-and-session-store",
      "distributed-oauth-state",
      "distributed-refresh-coordination",
      "neo4j-aura-schema-migration-gate"
    ]
  }
} as const;

describe("GitExplore validation-only profile", () => {
  it("accepts the truthful local React/Vite, Rust, Neo4j, OAuth, and Strawn contract", () => {
    const manifest: ProjectManifest = projectManifestSchema.parse(localProfile);

    expect(manifest.framework).toBe("react-vite-rust-services");
    expect(manifest.providers.backend.provider).toBe("rust-axum");
    expect(manifest.providers.graph?.provider).toBe("neo4j-aura");
    expect(manifest.providers.auth?.provider).toBe("github-oauth");
    expect(manifest.providers.designSystem).toMatchObject({
      source: "npm",
      version: "0.2.0",
      packages: ["strawn", "strawn-icons"]
    });
  });

  it("accepts the durable production contract only with no blockers", () => {
    const durable = projectManifestSchema.parse({
      ...localProfile,
      providers: {
        ...localProfile.providers,
        deployment: {
          ...localProfile.providers.deployment,
          cnameTarget: "7f022f9bfa96016e.vercel-dns-017.com.",
          cnameTargetVerification: "vercel-domain-inspected"
        },
        backend: {
          ...localProfile.providers.backend,
          identityStore: {
            provider: "neo4j",
            productionReady: true,
            encryption: {
              algorithm: "xchacha20-poly1305",
              keyEnvironmentVariable: "GITEXPLORE_IDENTITY_ENCRYPTION_KEY",
              required: true
            },
            durableOAuthState: true,
            durableSessions: true
          },
          refreshCoordination: {
            provider: "neo4j-lease",
            productionReady: true,
            leaseSeconds: 60
          }
        },
        graph: {
          ...localProfile.providers.graph,
          migrationMode: "release-gated-idempotent-cli"
        }
      },
      status: "production",
      productionReadiness: { ready: true, blockers: [] }
    });

    expect(durable.productionReadiness?.ready).toBe(true);
  });

  it("does not turn the profile into a generic scaffold combination", () => {
    expect(() => projectManifestSchema.parse({
      ...localProfile,
      framework: "vite-react"
    })).toThrow("limited to the React/Vite services profile");

    expect(getProviderDefinition("backend", "rust-axum").validationOnly).toBe(true);
    expect(getProviderDefinition("graph", "neo4j-aura").validationOnly).toBe(true);
    expect(getProviderDefinition("auth", "github-oauth").validationOnly).toBe(true);
  });

  it("rejects stale Svelte, repository-pin, and browser API-origin declarations", () => {
    expect(() => projectManifestSchema.parse({
      ...localProfile,
      framework: "sveltekit-rust-services"
    })).toThrow();

    expect(() => projectManifestSchema.parse({
      ...localProfile,
      providers: {
        ...localProfile.providers,
        designSystem: {
          provider: "strawn",
          source: "repository-pin",
          version: "0.1.0",
          commit: "7c4bc3421f41cfd91aaa970c2066e8382853d3da",
          integration: "semantic-token-snapshot"
        }
      }
    })).toThrow();

    expect(() => projectManifestSchema.parse({
      ...localProfile,
      runtimeEnvironment: {
        ...runtimeEnvironment,
        public: ["PUBLIC_GITEXPLORE_API_BASE_URL"]
      }
    })).toThrow("must not expose browser runtime variables");
  });

  it("keeps the generic Vite/React scaffold on the Strawn 0.1.0 contract", () => {
    const genericProfile = {
      manifestVersion: 2,
      name: "Generic",
      slug: "generic",
      description: "Generic Vite app",
      framework: "vite-react",
      projectType: "application",
      providers: {
        deployment: { provider: "vercel" },
        backend: { provider: "supabase" },
        designSystem: {
          provider: "strawn",
          source: "npm",
          version: "0.1.0",
          packages: ["strawn", "strawn-icons"],
          requiredComponents: ["ThemeProvider", "TooltipProvider"]
        }
      },
      urls: {},
      status: "local"
    } as const;

    expect(projectManifestSchema.parse(genericProfile).providers.designSystem.version).toBe("0.1.0");
    expect(() => projectManifestSchema.parse({
      ...genericProfile,
      providers: {
        ...genericProfile.providers,
        designSystem: {
          provider: "strawn",
          source: "npm",
          version: "0.2.0",
          packages: ["strawn", "strawn-icons"]
        }
      }
    })).toThrow("Generic Vite/React scaffolds use the Strawn 0.1.0 npm contract");
  });
});
