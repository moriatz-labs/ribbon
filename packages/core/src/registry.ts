import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  projectManifestSchema,
  registrySchema,
  type ProjectManifest,
  type Registry
} from "./manifest.js";

const emptyRegistry: Registry = { version: 1, projects: [] };

async function ensureDirectory(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

export async function readRegistry(path: string): Promise<Registry> {
  try {
    const content = await readFile(path, "utf8");
    return registrySchema.parse(JSON.parse(content));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyRegistry;
    }
    throw error;
  }
}

export async function writeRegistry(path: string, registry: Registry): Promise<void> {
  const parsed = registrySchema.parse(registry);
  await ensureDirectory(path);

  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export async function upsertProject(path: string, project: ProjectManifest): Promise<Registry> {
  const parsed = projectManifestSchema.parse(project);
  const registry = await readRegistry(path);
  const now = new Date().toISOString();
  const existing = registry.projects.find((item) => item.slug === parsed.slug);

  const nextProject: ProjectManifest = {
    ...existing,
    ...parsed,
    createdAt: existing?.createdAt ?? parsed.createdAt ?? now,
    updatedAt: now
  };

  const projects = registry.projects
    .filter((item) => item.slug !== parsed.slug)
    .concat(nextProject)
    .sort((left, right) => left.slug.localeCompare(right.slug));

  const nextRegistry: Registry = { version: 1, projects };
  await writeRegistry(path, nextRegistry);
  return nextRegistry;
}

