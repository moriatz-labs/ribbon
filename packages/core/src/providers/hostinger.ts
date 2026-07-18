import type {
  DnsProviderAdapter,
  DnsProvisionInput,
  DnsProvisionResult
} from "./contracts.js";

export interface HostingerDnsRecordValue {
  content: string;
  is_disabled?: boolean;
}

export interface HostingerDnsRecordGroup {
  name: string;
  records: HostingerDnsRecordValue[];
  ttl: number;
  type: string;
}

export interface HostingerCnameResult extends DnsProvisionResult {
  provider: "hostinger";
  changed: boolean;
  hostname: string;
  target: string;
  record: HostingerDnsRecordGroup;
}

interface HostingerErrorResponse {
  error?: string | { message?: string };
  message?: string;
  correlation_id?: string;
}

function normalizeDnsName(value: string, label: string) {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  const valid =
    normalized.length <= 253 &&
    normalized.includes(".") &&
    normalized.split(".").every((part) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)
    );

  if (!valid) {
    throw new Error(`${label} must be a valid DNS hostname without a protocol or path.`);
  }

  return normalized;
}

function errorDetail(payload: HostingerErrorResponse | undefined) {
  if (typeof payload?.error === "string") return payload.error;
  return payload?.error?.message ?? payload?.message ?? "unknown error";
}

export class HostingerClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://developers.hostinger.com/api/dns/v1",
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
    const text = await response.text();
    const payload = text ? JSON.parse(text) as T & HostingerErrorResponse : undefined;

    if (!response.ok) {
      const correlation = payload?.correlation_id ? ` (${payload.correlation_id})` : "";
      throw new Error(
        `Hostinger API failed (${response.status}): ${errorDetail(payload)}${correlation}`
      );
    }

    return payload as T;
  }

  getDnsRecords(domain: string) {
    return this.request<HostingerDnsRecordGroup[]>(
      `/zones/${encodeURIComponent(normalizeDnsName(domain, "Domain"))}`
    );
  }

  private validateDnsRecords(domain: string, zone: HostingerDnsRecordGroup[]) {
    return this.request<unknown>(
      `/zones/${encodeURIComponent(domain)}/validate`,
      { method: "POST", body: JSON.stringify({ zone }) }
    );
  }

  private updateDnsRecords(domain: string, zone: HostingerDnsRecordGroup[]) {
    return this.request<unknown>(
      `/zones/${encodeURIComponent(domain)}`,
      { method: "PUT", body: JSON.stringify({ overwrite: true, zone }) }
    );
  }

  async upsertCname(
    domainInput: string,
    hostnameInput: string,
    targetInput: string,
    ttl = 300
  ): Promise<HostingerCnameResult> {
    const domain = normalizeDnsName(domainInput, "Domain");
    const hostname = normalizeDnsName(hostnameInput, "Hostname");
    const target = normalizeDnsName(targetInput, "CNAME target");

    if (hostname === domain || !hostname.endsWith(`.${domain}`)) {
      throw new Error(`Hostname must be a subdomain of ${domain}.`);
    }
    if (hostname === target) {
      throw new Error("CNAME target cannot point to itself.");
    }
    if (!Number.isInteger(ttl) || ttl < 300 || ttl > 86400) {
      throw new Error("TTL must be an integer between 300 and 86400 seconds.");
    }

    const name = hostname.slice(0, -(domain.length + 1));
    const groups = await this.getDnsRecords(domain);
    const sameName = groups.filter((group) => group.name.toLowerCase() === name);
    const conflicts = sameName.filter((group) => group.type.toUpperCase() !== "CNAME");

    if (conflicts.length > 0) {
      throw new Error(
        `${hostname} already has ${conflicts.map((group) => group.type).join(", ")} records; remove them explicitly before creating a CNAME.`
      );
    }

    const existing = sameName.find((group) => group.type.toUpperCase() === "CNAME");
    const targetWithDot = `${target}.`;
    const unchanged =
      existing?.ttl === ttl &&
      existing.records.length === 1 &&
      existing.records[0]?.content.toLowerCase().replace(/\.$/, "") === target &&
      existing.records[0]?.is_disabled !== true;
    const record: HostingerDnsRecordGroup = {
      name,
      records: [{ content: targetWithDot, is_disabled: false }],
      ttl,
      type: "CNAME"
    };

    if (unchanged) {
      return { provider: "hostinger", changed: false, hostname, target, record };
    }

    await this.validateDnsRecords(domain, [record]);
    await this.updateDnsRecords(domain, [record]);
    return { provider: "hostinger", changed: true, hostname, target, record };
  }
}

export class HostingerDnsAdapter implements DnsProviderAdapter {
  readonly id = "hostinger" as const;

  constructor(
    private readonly client: HostingerClient,
    private readonly domain: string
  ) {}

  upsertCname(input: DnsProvisionInput) {
    return this.client.upsertCname(this.domain, input.hostname, input.target, input.ttl);
  }
}
