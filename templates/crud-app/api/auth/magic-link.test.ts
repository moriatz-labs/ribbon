import { describe, expect, it } from "vitest";
import { POST } from "./magic-link";

describe("magic-link API", () => {
  it("rejects invalid email before accessing providers", async () => {
    const response = await POST(new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" })
    }));

    expect(response.status).toBe(400);
  });
});
