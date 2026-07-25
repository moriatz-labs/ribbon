import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  saveCloudflareCredentials,
  saveDesignSystemCredentials,
  saveHostingerCredentials
} from "../src/credentials.js";

describe("saveHostingerCredentials", () => {
  it("writes Hostinger DNS and mail credentials", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-credentials-"));
    const path = join(directory, "credentials.env");

    await saveHostingerCredentials({
      token: "secret-token",
      domain: "MORIATZ.COM",
      mailApiToken: "mail-token",
      mailboxId: "mailbox-123",
      mailFrom: "NOREPLY@MORIATZ.COM",
      path
    });

    expect(await readFile(path, "utf8")).toBe(
      [
        "HOSTINGER_API_TOKEN=secret-token",
        "HOSTINGER_DOMAIN=moriatz.com",
        "HOSTINGER_MAIL_API_TOKEN=mail-token",
        "HOSTINGER_MAILBOX_ID=mailbox-123",
        "HOSTINGER_MAIL_FROM=noreply@moriatz.com",
        ""
      ].join("\n")
    );
  });

  it("rejects a partial Hostinger mail configuration", async () => {
    await expect(saveHostingerCredentials({
      token: "secret-token",
      domain: "moriatz.com",
      mailApiToken: "mail-token",
      path: join(tmpdir(), "unused-partial-vscd-credentials.env")
    })).rejects.toThrow("must be imported together");
  });

  it("rejects newline injection", async () => {
    await expect(saveHostingerCredentials({
      token: "secret\nOTHER=value",
      domain: "moriatz.com",
      path: join(tmpdir(), "unused-vscd-credentials.env")
    })).rejects.toThrow("single-line");
  });

  it("preserves Hostinger values when storing the private design-system key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-design-system-credentials-"));
    const path = join(directory, "credentials.env");
    const keyHeader = ["-----BEGIN", "OPENSSH PRIVATE KEY-----"].join(" ");
    const keyFooter = ["-----END", "OPENSSH PRIVATE KEY-----"].join(" ");
    await saveHostingerCredentials({ token: "dns-token", domain: "moriatz.com", path });
    await saveDesignSystemCredentials({
      deployKey: `${keyHeader}\ntest-material\n${keyFooter}`,
      commit: "fca3a35e26117f708000e8880e6c1fbabbfb3099",
      path
    });

    const stored = await readFile(path, "utf8");
    expect(stored).toContain("HOSTINGER_API_TOKEN=dns-token");
    expect(stored).toContain(`DESIGN_SYSTEM_DEPLOY_KEY=${keyHeader}\\ntest-material`);
    expect(stored).toContain("DESIGN_SYSTEM_COMMIT=fca3a35e26117f708000e8880e6c1fbabbfb3099");
  });
});

describe("saveCloudflareCredentials", () => {
  it("writes the zone-scoped DNS contract", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vscd-cloudflare-"));
    const path = join(directory, "credentials.env");

    await saveCloudflareCredentials({
      token: "cloudflare-test-token",
      zoneId: "zone-id",
      domain: "Example.COM",
      path
    });

    const stored = await readFile(path, "utf8");
    expect(stored).toContain("CLOUDFLARE_API_TOKEN=cloudflare-test-token");
    expect(stored).toContain("CLOUDFLARE_ZONE_ID=zone-id");
    expect(stored).toContain("CLOUDFLARE_DOMAIN=example.com");
  });
});
