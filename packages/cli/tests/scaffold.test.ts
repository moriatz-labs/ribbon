import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectManifestSchema } from "@vscd/core";
import { describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold.js";

describe("scaffoldProject", () => {
  it("configures the default Hostinger subdomain", async () => {
    const parent = await mkdtemp(join(tmpdir(), "vscd-scaffold-"));
    const target = join(parent, "notes-app");

    await scaffoldProject("notes-app", target, undefined, "moriatz.com");

    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(target, "vscd.json"), "utf8"))
    );
    const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
    const envExample = await readFile(join(target, ".env.example"), "utf8");
    const app = await readFile(join(target, "src", "App.tsx"), "utf8");
    const backend = await readFile(join(target, "src", "lib", "providers", "supabase.ts"), "utf8");
    const main = await readFile(join(target, "src", "main.tsx"), "utf8");
    const packageJson = await readFile(join(target, "package.json"), "utf8");
    const vitestConfig = await readFile(join(target, "vitest.config.ts"), "utf8");
    const magicLink = await readFile(join(target, "api", "auth", "magic-link.ts"), "utf8");

    expect(manifest.providers.dns).toMatchObject({
      provider: "hostinger",
      domain: "moriatz.com",
      hostname: "notes-app.moriatz.com",
      ttl: 300
    });
    expect(manifest.providers.mail).toMatchObject({ provider: "hostinger-mail" });
    expect(manifest.providers.backend.provider).toBe("supabase");
    expect(manifest.providers.deployment.provider).toBe("vercel");
    expect(manifest.projectType).toBe("application");
    expect(manifest.providers.designSystem).toMatchObject({
      source: "../design-system",
      repository: "https://github.com/Paul-M-Kallarackal/design-system",
      commit: "fca3a35e26117f708000e8880e6c1fbabbfb3099",
      requiredComponents: ["DatePicker"]
    });
    expect(release).toContain("notes-app.moriatz.com");
    expect(release).not.toContain("__APP_DOMAIN__");
    expect(envExample).toContain("HOSTINGER_MAIL_API_TOKEN=");
    expect(backend).toContain('fetch("/api/auth/magic-link"');
    expect(app).toContain('import { DatePicker } from "@paul/ui-patterns"');
    expect(app).not.toContain("lucide-react");
    expect(main).toContain('import "@paul/ui-tokens/styles.css"');
    expect(packageJson).toContain("prepare:design-system");
    expect(vitestConfig).toContain('".vercel-design-system/**"');
    expect(magicLink).toContain("https://notes-app.moriatz.com");
    expect(magicLink).not.toContain("__APP_TITLE__");
  });

  it("scaffolds every built-in DNS, backend, and deployment combination", async () => {
    const parent = await mkdtemp(join(tmpdir(), "vscd-matrix-"));
    const dnsProviders = ["hostinger", "cloudflare"] as const;
    const backendProviders = ["supabase", "firebase"] as const;
    const deploymentProviders = ["vercel", "netlify"] as const;

    for (const dnsProvider of dnsProviders) {
      for (const backendProvider of backendProviders) {
        for (const deploymentProvider of deploymentProviders) {
          const slug = `${dnsProvider}-${backendProvider}-${deploymentProvider}`;
          const target = join(parent, slug);
          await scaffoldProject(slug, target, {
            domain: "example.com",
            dnsProvider,
            backendProvider,
            deploymentProvider
          });
          const manifest = projectManifestSchema.parse(
            JSON.parse(await readFile(join(target, "vscd.json"), "utf8"))
          );
          const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
          const packageJson = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as {
            dependencies: Record<string, string>;
          };

          expect(manifest.providers.dns?.provider).toBe(dnsProvider);
          expect(manifest.providers.backend.provider).toBe(backendProvider);
          expect(manifest.providers.deployment.provider).toBe(deploymentProvider);
          expect(release.toLowerCase()).toContain(deploymentProvider);
          if (deploymentProvider === "netlify") {
            expect(release).toContain(
              backendProvider === "supabase" ? "VITE_SUPABASE_URL" : "VITE_FIREBASE_PROJECT_ID"
            );
            expect(release).toContain("--no-build");
          }
          expect(packageJson.dependencies[backendProvider === "supabase" ? "@supabase/supabase-js" : "firebase"]).toBeTruthy();
          expect(await readFile(join(target, "src", "lib", "backend.ts"), "utf8")).toContain(`./providers/${backendProvider}`);
          const hasMagicLinkRoute = await readFile(join(target, "api", "auth", "magic-link.ts"), "utf8")
            .then(() => true)
            .catch(() => false);
          expect(hasMagicLinkRoute).toBe(backendProvider === "supabase" && deploymentProvider === "vercel");
          expect(manifest.providers.mail?.provider).toBe(
            backendProvider === "supabase" && deploymentProvider === "vercel"
              ? "hostinger-mail"
              : "backend"
          );
        }
      }
    }
  });
});
