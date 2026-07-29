/// <reference types="node" />

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  CloudflareClient,
  CloudflareDnsAdapter,
  HostingerClient,
  HostingerDnsAdapter
} from "@moriatz/ribbon-core";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !supabaseUrl || !publishableKey) {
    response.status(401).json({ error: "A valid Ribbon session is required" });
    return;
  }
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`
    }
  });
  if (!authResponse.ok) {
    response.status(401).json({ error: "The Ribbon session is invalid or expired" });
    return;
  }

  const { hostname, target = "cname.vercel-dns.com", provider = process.env.RIBBON_DNS_PROVIDER ?? "hostinger", ttl = 300 } = request.body as {
    hostname?: string;
    target?: string;
    provider?: "hostinger" | "cloudflare";
    ttl?: number;
  };
  const zoneName = provider === "hostinger" ? process.env.HOSTINGER_DOMAIN : process.env.CLOUDFLARE_DOMAIN;
  if (!zoneName) {
    response.status(503).json({ error: `${provider} DNS automation is not configured` });
    return;
  }
  const providerToken = provider === "hostinger"
    ? process.env.HOSTINGER_API_TOKEN
    : process.env.CLOUDFLARE_API_TOKEN;
  const cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!providerToken || (provider === "cloudflare" && !cloudflareZoneId)) {
    response.status(503).json({ error: `${provider} DNS credentials are incomplete` });
    return;
  }
  const allowed = hostname === zoneName || hostname?.endsWith(`.${zoneName}`);
  if (!hostname || !allowed) {
    response.status(400).json({ error: `Hostname must belong to the configured ${provider} zone` });
    return;
  }

  try {
    const adapter = provider === "hostinger"
      ? new HostingerDnsAdapter(
          new HostingerClient(providerToken),
          zoneName
        )
      : new CloudflareDnsAdapter(
          new CloudflareClient(providerToken),
          cloudflareZoneId!
        );
    const record = await adapter.upsertCname({ domain: zoneName, hostname, target, ttl });
    response.status(200).json({ record });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "DNS update failed" });
  }
}

