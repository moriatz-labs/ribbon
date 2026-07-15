export interface CloudflareDnsRecord {
  id: string;
  type: "A" | "AAAA" | "CNAME" | "TXT";
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

export class CloudflareClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.cloudflare.com/client/v4"
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
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

  async upsertVercelCname(zoneId: string, name: string, target: string) {
    const query = new URLSearchParams({ type: "CNAME", name });
    const existing = await this.request<CloudflareDnsRecord[]>(
      `/zones/${zoneId}/dns_records?${query.toString()}`
    );
    const body = JSON.stringify({
      type: "CNAME",
      name,
      content: target,
      ttl: 1,
      proxied: false,
      comment: "Managed by VSCD for a Vercel project"
    });

    if (existing[0]) {
      return this.request<CloudflareDnsRecord>(
        `/zones/${zoneId}/dns_records/${existing[0].id}`,
        { method: "PATCH", body }
      );
    }

    return this.request<CloudflareDnsRecord>(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body
    });
  }
}

