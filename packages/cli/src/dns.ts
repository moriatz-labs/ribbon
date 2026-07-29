import {
  CloudflareClient,
  CloudflareDnsAdapter,
  HostingerClient,
  HostingerDnsAdapter,
  deploymentCnameTarget,
  type DnsProviderAdapter,
  type DnsProviderConfig,
  type DnsProvisionResult,
  type ProjectManifest
} from "@moriatz/ribbon-core";

export const DEFAULT_VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export function resolveDnsHostname(name: string, domain: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\.$/, "");
  const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, "");
  return normalizedName.includes(".")
    ? normalizedName
    : `${normalizedName}.${normalizedDomain}`;
}

export const resolveHostingerHostname = resolveDnsHostname;

function environmentValue(name: string, environment: NodeJS.ProcessEnv) {
  const value = environment[name];
  if (!value) throw new Error(`${name} is required for the selected DNS provider.`);
  return value;
}

export function createDnsAdapter(
  config: DnsProviderConfig,
  environment: NodeJS.ProcessEnv = process.env
): DnsProviderAdapter {
  if (config.provider === "hostinger") {
    return new HostingerDnsAdapter(
      new HostingerClient(environmentValue("HOSTINGER_API_TOKEN", environment)),
      config.domain
    );
  }
  const zoneId = config.zoneId ?? environmentValue("CLOUDFLARE_ZONE_ID", environment);
  return new CloudflareDnsAdapter(
    new CloudflareClient(environmentValue("CLOUDFLARE_API_TOKEN", environment)),
    zoneId
  );
}

export async function provisionDnsCname({
  manifest,
  target,
  environment = process.env
}: {
  manifest: ProjectManifest;
  target?: string;
  environment?: NodeJS.ProcessEnv;
}): Promise<DnsProvisionResult> {
  const dns = manifest.providers.dns;
  if (!dns) throw new Error("This manifest does not select a DNS provider.");
  if (!dns.domain || !dns.hostname) {
    throw new Error(`${dns.provider} DNS requires both domain and hostname metadata.`);
  }
  const resolvedTarget = target ?? deploymentCnameTarget(manifest.providers.deployment);
  if (!resolvedTarget) {
    throw new Error("The selected deployment provider does not declare a CNAME target yet.");
  }
  return createDnsAdapter(dns, environment).upsertCname({
    domain: dns.domain,
    hostname: dns.hostname,
    target: resolvedTarget,
    ttl: dns.ttl
  });
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
}): Promise<DnsProvisionResult> {
  const manifest = {
    manifestVersion: 2,
    name,
    slug: name.split(".")[0] ?? name,
    description: "",
    framework: "vite-react",
    providers: {
      deployment: { provider: "vercel", cnameTarget: target },
      backend: { provider: "supabase" },
      dns: {
        provider: "hostinger",
        domain,
        hostname: resolveDnsHostname(name, domain),
        ttl: 300
      },
      designSystem: {
        provider: "strawn",
        source: "npm",
        version: "0.1.0",
        packages: ["strawn", "strawn-icons"],
        requiredComponents: ["ThemeProvider", "TooltipProvider"]
      }
    },
    urls: {},
    status: "local"
  } as ProjectManifest;
  return provisionDnsCname({ manifest, environment: { HOSTINGER_API_TOKEN: token } });
}
