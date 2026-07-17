import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readRegistry, upsertProject, type ProjectManifest } from "../src/index.js";

const project: ProjectManifest = {
  name: "Example",
  slug: "example",
  description: "Test project",
  framework: "vite-react",
  providers: {
    vercel: {},
    supabase: {},
    hostinger: {
      domain: "moriatz.com",
      hostname: "example.moriatz.com",
      ttl: 300
    },
    designSystem: {
      source: "C:\\design-system",
      repository: "https://github.com/Paul-M-Kallarackal/design-system",
      commit: "fca3a35e26117f708000e8880e6c1fbabbfb3099",
      packages: [
        "@paul/ui-core",
        "@paul/ui-icons",
        "@paul/ui-patterns",
        "@paul/ui-tokens",
        "@paul/ui-themes"
      ],
      requiredComponents: ["DatePicker"]
    }
  },
  urls: {},
  status: "local"
};

describe("registry", () => {
  it("upserts a project atomically", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-registry-"));
    const path = join(directory, "registry.json");

    await upsertProject(path, project);
    const registry = await readRegistry(path);
    const persisted = JSON.parse(await readFile(path, "utf8")) as unknown;

    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0]?.slug).toBe("example");
    expect(persisted).toMatchObject({ version: 1 });
  });

  it("rejects proxied Cloudflare records in manifests", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-registry-"));
    const path = join(directory, "registry.json");

    await expect(
      upsertProject(path, {
        ...project,
        providers: {
          ...project.providers,
          hostinger: undefined,
          cloudflare: { proxied: true as false }
        }
      })
    ).rejects.toThrow();
  });

  it("rejects a Hostinger hostname outside its configured domain", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-registry-"));
    const path = join(directory, "registry.json");

    await expect(
      upsertProject(path, {
        ...project,
        providers: {
          ...project.providers,
          hostinger: {
            domain: "moriatz.com",
            hostname: "example.net",
            ttl: 300
          }
        }
      })
    ).rejects.toThrow("Hostinger hostname must be a subdomain");
  });

  it("does not allow generated apps to claim the control-plane exemption", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-registry-"));

    await expect(
      upsertProject(join(directory, "registry.json"), {
        ...project,
        projectType: "control-plane"
      })
    ).rejects.toThrow("Only the VSCD repository");
  });
});

