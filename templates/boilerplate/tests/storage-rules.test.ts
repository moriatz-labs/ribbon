import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Firebase Storage authorization rules", () => {
  it("binds attachment paths to the authenticated user", async () => {
    const rules = await readFile(new URL("../storage.rules", import.meta.url), "utf8");
    expect(rules).toContain("request.auth.uid == userId");
  });
});
