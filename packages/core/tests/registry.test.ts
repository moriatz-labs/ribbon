import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { projectManifestSchema, readRegistry, upsertProject, type ProjectManifest } from "../src/index.js";

const project: ProjectManifest = {
  name: "Example",
  slug: "example",
  description: "Test project",
  framework: "vite-react",
  manifestVersion: 2,
  providers: {
    deployment: { provider: "vercel", cnameTarget: "cname.vercel-dns.com" },
    backend: { provider: "supabase" },
    dns: {
      provider: "hostinger",
      domain: "moriatz.com",
      hostname: "example.moriatz.com",
      ttl: 300
    },
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
};

describe("registry", () => {
  it("keeps the published JSON schema aligned with both npm Strawn contracts", async () => {
    const schemaPath = fileURLToPath(
      new URL("../../../schemas/ribbon.schema.json", import.meta.url)
    );
    const schemaSource = await readFile(schemaPath, "utf8");

    expect(schemaSource).toContain('"provider": { "const": "strawn" }');
    expect(schemaSource).toContain('{ "const": "strawn-icons" }');
    expect(schemaSource).toContain('"version": { "const": "0.1.0" }');
    expect(schemaSource).toContain('"version": { "const": "0.2.0" }');
    expect(schemaSource).toContain('"framework": { "enum": ["vite-react", "react-vite-rust-services"] }');
    expect(schemaSource).not.toContain("sveltekit-rust-services");
    expect(schemaSource).not.toContain("repository-pin");
    expect(schemaSource).not.toContain("@paul/ui-");
    expect(schemaSource).toContain('"provider": { "const": "firebase-hosting" }');
  });

  it("accepts Firebase Hosting without external DNS", () => {
    const firebaseProject = projectManifestSchema.parse({
      ...project,
      providers: {
        deployment: { provider: "firebase-hosting" },
        backend: { provider: "firebase", storage: "none" },
        mail: { provider: "backend" },
        designSystem: project.providers.designSystem
      }
    });

    expect(firebaseProject.providers.deployment.provider).toBe("firebase-hosting");
    expect(firebaseProject.providers.dns).toBeUndefined();
  });

  it("upserts a project atomically", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ribbon-registry-"));
    const path = join(directory, "registry.json");

    await upsertProject(path, project);
    const registry = await readRegistry(path);
    const persisted = JSON.parse(await readFile(path, "utf8")) as unknown;

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]?.slug).toBe("example");
    expect(persisted).toMatchObject({ version: 1 });
  });

  it("rejects proxied Cloudflare records in manifests", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ribbon-registry-"));
    const path = join(directory, "registry.json");

    await expect(
      upsertProject(path, {
        ...project,
        providers: {
          ...project.providers,
          dns: {
            provider: "cloudflare",
            domain: "moriatz.com",
            hostname: "example.moriatz.com",
            proxied: true as false
          }
        }
      })
    ).rejects.toThrow();
  });

  it("rejects a Hostinger hostname outside its configured domain", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ribbon-registry-"));
    const path = join(directory, "registry.json");

    await expect(
      upsertProject(path, {
        ...project,
        providers: {
          ...project.providers,
          dns: {
            provider: "hostinger",
            domain: "moriatz.com",
            hostname: "example.net",
            ttl: 300
          }
        }
      })
    ).rejects.toThrow("Hostinger hostname must be a subdomain");
  });

  it("does not allow generated apps to claim the control-plane exemption", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ribbon-registry-"));

    await expect(
      upsertProject(join(directory, "registry.json"), {
        ...project,
        projectType: "control-plane"
      })
    ).rejects.toThrow("Only the Ribbon repository");
  });

  it("normalizes legacy provider-named manifests into capability slots", () => {
    const legacy = projectManifestSchema.parse({
      ...project,
      manifestVersion: undefined,
      providers: {
        vercel: { projectName: "example" },
        supabase: { projectRef: "project-ref" },
        cloudflare: {
          zoneId: "zone-id",
          domain: "moriatz.com",
          hostname: "example.moriatz.com",
          proxied: false
        },
        designSystem: project.providers.designSystem
      }
    });

    expect(legacy.manifestVersion).toBe(2);
    expect(legacy.providers.deployment.provider).toBe("vercel");
    expect(legacy.providers.backend.provider).toBe("supabase");
    expect(legacy.providers.dns?.provider).toBe("cloudflare");
  });
});
