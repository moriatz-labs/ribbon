const required = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CUSTOM_DOMAIN"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const hostname = process.env.CUSTOM_DOMAIN;
const target = process.env.VERCEL_CNAME_TARGET || "cname.vercel-dns.com";
const base = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const list = await fetch(`${base}?type=CNAME&name=${encodeURIComponent(hostname)}`, { headers });
const listPayload = await list.json();
if (!list.ok || !listPayload.success) throw new Error(JSON.stringify(listPayload.errors));

const body = JSON.stringify({ type: "CNAME", name: hostname, content: target, ttl: 1, proxied: false, comment: "Managed by VSCD" });
const existing = listPayload.result[0];
const response = await fetch(existing ? `${base}/${existing.id}` : base, {
  method: existing ? "PATCH" : "POST",
  headers,
  body
});
const payload = await response.json();
if (!response.ok || !payload.success) throw new Error(JSON.stringify(payload.errors));
console.log(JSON.stringify({ hostname, target, proxied: false }));

