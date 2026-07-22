import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("generated app design-system contract", () => {
  it("uses the public Strawn packages without legacy private wiring", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain('from "strawn";');
    expect(source).toContain('from "strawn-icons";');
    expect(source).not.toContain("@paul/");
    expect(source).toContain('id="review-date"');
    expect(source).not.toContain('input[type="date"]');
    expect(source).not.toMatch(/<input[^>]+type=["']date["']/i);
  });
});
