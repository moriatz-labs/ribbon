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
    cloudflare: { proxied: false },
    designSystem: { source: "C:\\design-system" }
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
          cloudflare: { proxied: true as false }
        }
      })
    ).rejects.toThrow();
  });
});

