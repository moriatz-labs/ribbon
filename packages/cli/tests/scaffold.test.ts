import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectManifestSchema } from "@moriatz/ribbon-core";
import { describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold.js";

describe("scaffoldProject", () => {
  it("configures the default Hostinger subdomain", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ribbon-scaffold-"));
    const target = join(parent, "notes-app");

    await scaffoldProject("notes-app", target, undefined, "moriatz.com");

    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(target, "ribbon.json"), "utf8"))
    );
    const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
    const envExample = await readFile(join(target, ".env.example"), "utf8");
    const app = await readFile(join(target, "src", "App.tsx"), "utf8");
    const backend = await readFile(join(target, "src", "lib", "providers", "supabase.ts"), "utf8");
    const main = await readFile(join(target, "src", "main.tsx"), "utf8");
    const packageJson = await readFile(join(target, "package.json"), "utf8");
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
      provider: "strawn",
      source: "npm",
      version: "0.1.0",
      requiredComponents: ["ThemeProvider", "TooltipProvider"]
    });
    expect(release).toContain("notes-app.moriatz.com");
    expect(release).not.toContain("__APP_DOMAIN__");
    expect(envExample).toContain("HOSTINGER_MAIL_API_TOKEN=");
    expect(backend).toContain('fetch("/api/auth/magic-link"');
    expect(app).toContain('from "strawn"');
    expect(app).toContain('from "strawn-icons"');
    expect(app).not.toContain("lucide-react");
    expect(main).toContain("ThemeProvider");
    expect(packageJson).toContain('"strawn": "0.1.0"');
    expect(packageJson).toContain('"strawn-icons": "0.1.0"');
    expect(magicLink).toContain("https://notes-app.moriatz.com");
    expect(magicLink).not.toContain("__APP_TITLE__");
  });

  it("scaffolds every built-in DNS, backend, and deployment combination", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ribbon-matrix-"));
    const dnsProviders = ["hostinger", "cloudflare"] as const;
    const backendProviders = ["supabase", "firebase"] as const;
    const deploymentProviders = ["vercel", "netlify", "firebase-hosting"] as const;

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
            JSON.parse(await readFile(join(target, "ribbon.json"), "utf8"))
          );
          const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
          const ci = await readFile(join(target, ".github", "workflows", "ci.yml"), "utf8");
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
          } else if (deploymentProvider === "firebase-hosting") {
            expect(release).toContain("FIREBASE_SERVICE_ACCOUNT_JSON");
            expect(release).toContain("firebase deploy");
            expect(release).toContain(
              backendProvider === "firebase"
                ? "--only \"hosting,firestore:rules\""
                : "--only \"hosting\""
            );
            const firebaseConfig = JSON.parse(
              await readFile(join(target, "firebase.json"), "utf8")
            ) as { hosting?: { public?: string }; firestore?: unknown; storage?: unknown };
            expect(firebaseConfig.hosting?.public).toBe("dist");
            expect(Boolean(firebaseConfig.firestore)).toBe(backendProvider === "firebase");
            expect(Boolean(firebaseConfig.storage)).toBe(false);
          }
          expect(packageJson.dependencies[backendProvider === "supabase" ? "@supabase/supabase-js" : "firebase"]).toBeTruthy();
          if (backendProvider === "firebase") {
            expect(ci).toContain("Firebase authorization contracts");
            expect(ci).not.toContain("supabase");
          }
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

  it("can use Firebase's default web.app domain without an external DNS provider", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ribbon-firebase-only-"));
    const target = join(parent, "firebase-only");

    await scaffoldProject("firebase-only", target, {
      includeDomain: false,
      backendProvider: "firebase",
      deploymentProvider: "firebase-hosting"
    });

    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(target, "ribbon.json"), "utf8"))
    );
    const envExample = await readFile(join(target, ".env.example"), "utf8");
    const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
    const ci = await readFile(join(target, ".github", "workflows", "ci.yml"), "utf8");
    const backend = await readFile(join(target, "src", "lib", "providers", "firebase.ts"), "utf8");
    const hasSupabaseDirectory = await readFile(
      join(target, "supabase", "config.toml"),
      "utf8"
    ).then(() => true).catch(() => false);

    expect(manifest.providers).not.toHaveProperty("dns");
    expect(manifest.providers.backend.provider).toBe("firebase");
    expect(
      manifest.providers.backend.provider === "firebase"
        ? manifest.providers.backend.storage
        : undefined
    ).toBe("none");
    expect(manifest.providers.deployment.provider).toBe("firebase-hosting");
    expect(manifest.providers.mail?.provider).toBe("backend");
    expect(envExample).not.toContain("HOSTINGER_");
    expect(envExample).not.toContain("CLOUDFLARE_");
    expect(envExample).not.toContain("VITE_FIREBASE_STORAGE_BUCKET");
    expect(release).toContain("https://${FIREBASE_PROJECT_ID}.web.app");
    expect(release).not.toContain("VITE_FIREBASE_STORAGE_BUCKET");
    expect(release).not.toContain(",storage");
    expect(release).not.toContain("SUPABASE");
    expect(ci).not.toContain("supabase");
    expect(backend).not.toContain('from "firebase/storage"');
    expect(hasSupabaseDirectory).toBe(false);
  });

  it("keeps Cloud Storage as an explicit Firebase Blaze opt-in", async () => {
    const parent = await mkdtemp(join(tmpdir(), "ribbon-firebase-storage-"));
    const target = join(parent, "firebase-storage");

    await scaffoldProject("firebase-storage", target, {
      includeDomain: false,
      backendProvider: "firebase",
      firebaseStorage: "cloud-storage",
      deploymentProvider: "firebase-hosting"
    });

    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(join(target, "ribbon.json"), "utf8"))
    );
    const release = await readFile(join(target, ".github", "workflows", "release.yml"), "utf8");
    const envExample = await readFile(join(target, ".env.example"), "utf8");
    const firebaseConfig = JSON.parse(
      await readFile(join(target, "firebase.json"), "utf8")
    ) as { storage?: unknown };

    expect(
      manifest.providers.backend.provider === "firebase"
        ? manifest.providers.backend.storage
        : undefined
    ).toBe("cloud-storage");
    expect(release).toContain("--only \"hosting,firestore:rules,storage\"");
    expect(envExample).toContain("VITE_FIREBASE_STORAGE_BUCKET=");
    expect(firebaseConfig.storage).toBeTruthy();
  });
});
