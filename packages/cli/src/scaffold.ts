import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function replaceInFiles(path: string, replacements: Record<string, string>) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await replaceInFiles(fullPath, replacements);
      continue;
    }

    if (/\.(?:json|md|ts|tsx|css|html|toml|sql|yaml|yml|example)$/.test(entry.name)) {
      let content = await readFile(fullPath, "utf8");
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replaceAll(placeholder, value);
      }
      await writeFile(fullPath, content, "utf8");
    }
  }
}

function findVscdRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../../..");
}

export async function scaffoldProject(slug: string, targetPath: string, title?: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Project slug must use lowercase letters, digits, and hyphens.");
  }

  const templatePath = join(findVscdRoot(), "templates", "crud-app");
  await cp(templatePath, targetPath, { recursive: true, errorOnExist: true, force: false });
  await replaceInFiles(targetPath, {
    "__APP_SLUG__": slug,
    "__APP_TITLE__": title ?? titleFromSlug(slug),
    "__CREATED_AT__": new Date().toISOString()
  });

  return targetPath;
}

