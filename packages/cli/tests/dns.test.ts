import { describe, expect, it } from "vitest";
import { resolveHostingerHostname } from "../src/dns.js";

describe("resolveHostingerHostname", () => {
  it("expands a project slug under the configured domain", () => {
    expect(resolveHostingerHostname("notes-app", "moriatz.com"))
      .toBe("notes-app.moriatz.com");
  });

  it("preserves an explicit hostname", () => {
    expect(resolveHostingerHostname("admin.moriatz.com", "moriatz.com"))
      .toBe("admin.moriatz.com");
  });
});
