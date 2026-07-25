import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("generated app design-system contract", () => {
  it("keeps date fields on the shared single-trigger DatePicker", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain('import { DatePicker } from "@paul/ui-patterns";');
    expect(source).toContain('id="review-date"');
    expect(source).not.toContain('input[type="date"]');
    expect(source).not.toMatch(/<input[^>]+type=["']date["']/i);
  });
});
