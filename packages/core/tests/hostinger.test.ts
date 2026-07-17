import { describe, expect, it, vi } from "vitest";
import { HostingerClient, type HostingerDnsRecordGroup } from "../src/index.js";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("HostingerClient", () => {
  it("validates and creates a CNAME", async () => {
    const fetchImplementation = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (!init?.method) return jsonResponse([]);
      return jsonResponse({ message: "Request accepted" });
    });
    const client = new HostingerClient(
      "test-token",
      "https://hostinger.test/api/dns/v1",
      fetchImplementation
    );

    const result = await client.upsertCname(
      "moriatz.com",
      "notes.moriatz.com",
      "cname.vercel-dns.com"
    );

    expect(result.changed).toBe(true);
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(fetchImplementation.mock.calls.map((call) => call[1]?.method ?? "GET"))
      .toEqual(["GET", "POST", "PUT"]);
    const updateBody = JSON.parse(String(fetchImplementation.mock.calls[2]?.[1]?.body));
    expect(updateBody).toEqual({
      overwrite: true,
      zone: [{
        name: "notes",
        records: [{ content: "cname.vercel-dns.com.", is_disabled: false }],
        ttl: 300,
        type: "CNAME"
      }]
    });
  });

  it("does not write an unchanged CNAME", async () => {
    const existing: HostingerDnsRecordGroup[] = [{
      name: "notes",
      records: [{ content: "cname.vercel-dns.com.", is_disabled: false }],
      ttl: 300,
      type: "CNAME"
    }];
    const fetchImplementation = vi.fn(async () => jsonResponse(existing));
    const client = new HostingerClient("test-token", "https://hostinger.test", fetchImplementation);

    const result = await client.upsertCname(
      "moriatz.com",
      "notes.moriatz.com",
      "cname.vercel-dns.com"
    );

    expect(result.changed).toBe(false);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("refuses to replace another record type", async () => {
    const existing: HostingerDnsRecordGroup[] = [{
      name: "notes",
      records: [{ content: "76.76.21.21" }],
      ttl: 14400,
      type: "A"
    }];
    const fetchImplementation = vi.fn(async () => jsonResponse(existing));
    const client = new HostingerClient("test-token", "https://hostinger.test", fetchImplementation);

    await expect(client.upsertCname(
      "moriatz.com",
      "notes.moriatz.com",
      "cname.vercel-dns.com"
    )).rejects.toThrow("already has A records");
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("rejects hostnames outside the configured domain", async () => {
    const fetchImplementation = vi.fn();
    const client = new HostingerClient("test-token", "https://hostinger.test", fetchImplementation);

    await expect(client.upsertCname(
      "moriatz.com",
      "notes.example.com",
      "cname.vercel-dns.com"
    )).rejects.toThrow("must be a subdomain of moriatz.com");
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
