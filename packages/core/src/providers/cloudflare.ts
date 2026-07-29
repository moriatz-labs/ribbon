import type {
  DnsProviderAdapter,
  DnsProvisionInput,
  DnsProvisionResult
} from "./contracts.js";

export interface CloudflareDnsRecord {
  id: string;
  type: "A" | "AAAA" | "ALIAS" | "CNAME" | "TXT";
  name: string;
  content: string;
  proxied?: boolean;
  ttl: number;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

function normalizeDnsName(value: string, label: string) {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || !normalized.includes(".")) {
    throw new Error(`${label} must be a valid DNS hostname.`);
  }
  return normalized;
}

export class CloudflareClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.cloudflare.com/client/v4",
    private readonly fetchImplementation: typeof fetch = fetch
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        ...init?.headers
      }
    });
    const payload = (await response.json()) as CloudflareResponse<T>;

    if (!response.ok || !payload.success) {
      const details = payload.errors.map((error) => error.message).join(", ");
      throw new Error(`Cloudflare API failed (${response.status}): ${details || "unknown error"}`);
    }

    return payload.result;
  }

  async verifyToken() {
    return this.request<{ id: string; status: string }>("/user/tokens/verify");
  }

  async upsertCname(
    zoneId: string,
    hostnameInput: string,
    targetInput: string,
    ttl = 300
  ): Promise<DnsProvisionResult> {
    const hostname = normalizeDnsName(hostnameInput, "Hostname");
    const target = normalizeDnsName(targetInput, "CNAME target");
    const query = new URLSearchParams({ name: hostname });
    const sameName = await this.request<CloudflareDnsRecord[]>(
      `/zones/${encodeURIComponent(zoneId)}/dns_records?${query.toString()}`
    );
    const conflicts = sameName.filter((record) => record.type !== "CNAME");
    if (conflicts.length > 0) {
      throw new Error(
        `${hostname} already has ${conflicts.map((record) => record.type).join(", ")} records; remove them explicitly before creating a CNAME.`
      );
    }

    const existing = sameName.find((record) => record.type === "CNAME");
    const unchanged = Boolean(
      existing
      && existing.content.toLowerCase().replace(/\.$/, "") === target
      && existing.proxied === false
      && existing.ttl === ttl
    );
    if (unchanged && existing) {
      return {
        provider: "cloudflare",
        changed: false,
        hostname,
        target,
        recordId: existing.id,
        record: existing
      };
    }

    const body = JSON.stringify({
      type: "CNAME",
      name: hostname,
      content: target,
      ttl,
      proxied: false,
      comment: "Managed by Ribbon"
    });
    const record = existing
      ? await this.request<CloudflareDnsRecord>(
          `/zones/${encodeURIComponent(zoneId)}/dns_records/${existing.id}`,
          { method: "PATCH", body }
        )
      : await this.request<CloudflareDnsRecord>(
          `/zones/${encodeURIComponent(zoneId)}/dns_records`,
          { method: "POST", body }
        );

    return {
      provider: "cloudflare",
      changed: true,
      hostname,
      target,
      recordId: record.id,
      record
    };
  }

  upsertVercelCname(zoneId: string, name: string, target: string) {
    return this.upsertCname(zoneId, name, target);
  }
}

export class CloudflareDnsAdapter implements DnsProviderAdapter {
  readonly id = "cloudflare" as const;

  constructor(
    private readonly client: CloudflareClient,
    private readonly zoneId: string
  ) {}

  upsertCname(input: DnsProvisionInput) {
    return this.client.upsertCname(this.zoneId, input.hostname, input.target, input.ttl);
  }
}

