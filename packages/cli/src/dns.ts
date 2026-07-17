import { HostingerClient, type HostingerCnameResult } from "@vscd/core";

export const DEFAULT_VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export function resolveHostingerHostname(name: string, domain: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\.$/, "");
  const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, "");
  return normalizedName.includes(".")
    ? normalizedName
    : `${normalizedName}.${normalizedDomain}`;
}

export async function provisionHostingerCname({
  token,
  domain,
  name,
  target = DEFAULT_VERCEL_CNAME_TARGET
}: {
  token: string;
  domain: string;
  name: string;
  target?: string;
}): Promise<HostingerCnameResult> {
  const hostname = resolveHostingerHostname(name, domain);
  return new HostingerClient(token).upsertCname(domain, hostname, target);
}
