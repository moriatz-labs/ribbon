import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Firebase authorization rules", () => {
  it("binds Firestore creates, reads, updates, and deletes to the authenticated owner", async () => {
    const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
    expect(rules).toContain("request.resource.data.owner_id == request.auth.uid");
    expect(rules).toContain("resource.data.owner_id == request.auth.uid");
    expect(rules).toContain("allow read, delete");
    expect(rules).toContain("allow update");
  });

  it("binds attachment paths to the authenticated user", async () => {
    const rules = await readFile(new URL("../storage.rules", import.meta.url), "utf8");
    expect(rules).toContain("request.auth.uid == userId");
  });
});

