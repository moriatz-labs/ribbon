import { describe, expect, it, vi } from "vitest";
import { CloudflareClient } from "../src/index.js";

function response(result: unknown) {
  return new Response(JSON.stringify({ success: true, errors: [], result }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("CloudflareClient", () => {
  it("creates a DNS-only CNAME through the common DNS contract", async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({
        id: "record-id",
        type: "CNAME",
        name: "app.example.com",
        content: "app.netlify.app",
        proxied: false,
        ttl: 300
      }));
    const client = new CloudflareClient("token", "https://cloudflare.test", fetchImplementation);

    const result = await client.upsertCname("zone-id", "app.example.com", "app.netlify.app", 300);

    expect(result).toMatchObject({
      provider: "cloudflare",
      changed: true,
      hostname: "app.example.com",
      target: "app.netlify.app",
      recordId: "record-id"
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(fetchImplementation.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(String(fetchImplementation.mock.calls[1]?.[1]?.body)).toContain('"proxied":false');
  });

  it("refuses to overwrite conflicting record types", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(response([{
      id: "record-id",
      type: "A",
      name: "app.example.com",
      content: "192.0.2.1",
      ttl: 300
    }]));
    const client = new CloudflareClient("token", "https://cloudflare.test", fetchImplementation);

    await expect(client.upsertCname("zone-id", "app.example.com", "app.netlify.app"))
      .rejects.toThrow("already has A records");
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});
