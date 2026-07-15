/// <reference types="node" />

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { CloudflareClient } from "@vscd/core";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const zoneName = process.env.CLOUDFLARE_ZONE_NAME;

  if (!token || !supabaseUrl || !publishableKey) {
    response.status(401).json({ error: "A valid VSCD session is required" });
    return;
  }
  if (!cloudflareToken || !zoneId || !zoneName) {
    response.status(503).json({ error: "Cloudflare DNS automation is not configured" });
    return;
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`
    }
  });
  if (!authResponse.ok) {
    response.status(401).json({ error: "The VSCD session is invalid or expired" });
    return;
  }

  const { hostname, target = "cname.vercel-dns.com" } = request.body as {
    hostname?: string;
    target?: string;
  };
  const allowed = hostname === zoneName || hostname?.endsWith(`.${zoneName}`);
  if (!hostname || !allowed) {
    response.status(400).json({ error: "Hostname must belong to the configured Cloudflare zone" });
    return;
  }

  const cloudflare = new CloudflareClient(cloudflareToken);
  const record = await cloudflare.upsertVercelCname(zoneId, hostname, target);
  response.status(200).json({ record: { ...record, proxied: false } });
}

