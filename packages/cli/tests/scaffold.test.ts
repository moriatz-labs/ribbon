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
    const main = await readFile(join(target, "src", "main.tsx"), "utf8");
    const packageJson = await readFile(join(target, "package.json"), "utf8");
    const vitestConfig = await readFile(join(target, "vitest.config.ts"), "utf8");
    const magicLink = await readFile(join(target, "api", "auth", "magic-link.ts"), "utf8");

    expect(manifest.providers.hostinger).toMatchObject({
      domain: "moriatz.com",
      hostname: "notes-app.moriatz.com",
      ttl: 300,
      mail: {
        provider: "hostinger-mail",
        apiTokenEnv: "HOSTINGER_MAIL_API_TOKEN",
        mailboxIdEnv: "HOSTINGER_MAILBOX_ID",
        fromEnv: "HOSTINGER_MAIL_FROM"
      }
    });
    expect(manifest.projectType).toBe("application");
    expect(manifest.providers.designSystem).toMatchObject({
      repository: "https://github.com/Paul-M-Kallarackal/design-system",
      commit: "fca3a35e26117f708000e8880e6c1fbabbfb3099",
      requiredComponents: ["DatePicker"]
    });
    expect(release).toContain("notes-app.moriatz.com");
    expect(release).not.toContain("__APP_DOMAIN__");
    expect(envExample).toContain("HOSTINGER_MAIL_API_TOKEN=");
    expect(app).toContain('fetch("/api/auth/magic-link"');
    expect(app).toContain('import { DatePicker } from "@paul/ui-patterns"');
    expect(app).not.toContain("lucide-react");
    expect(main).toContain('import "@paul/ui-tokens/styles.css"');
    expect(packageJson).toContain("prepare:design-system");
    expect(vitestConfig).toContain('".vercel-design-system/**"');
    expect(magicLink).toContain("https://notes-app.moriatz.com");
    expect(magicLink).not.toContain("__APP_TITLE__");
  });
});
