import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../ribbon.json", import.meta.url), "utf8"));
const dns = manifest.providers?.dns;
const deployment = manifest.providers?.deployment;
if (!dns) throw new Error("ribbon.json does not select a DNS provider.");
if (!dns.domain || !dns.hostname) throw new Error("The DNS provider requires domain and hostname metadata.");

const domain = dns.domain.toLowerCase().replace(/\.$/, "");
const hostname = dns.hostname.toLowerCase().replace(/\.$/, "");
const targetInput = (
  process.env.CUSTOM_CNAME_TARGET
  || deployment?.cnameTarget
  || (deployment?.provider === "netlify" && deployment?.siteName ? `${deployment.siteName}.netlify.app` : undefined)
);
if (!targetInput) throw new Error("The deployment provider does not declare a CNAME target.");
const target = targetInput.toLowerCase().replace(/\.$/, "");
const ttl = dns.ttl ?? 300;
if (hostname === domain || !hostname.endsWith(`.${domain}`)) {
  throw new Error(`DNS hostname must be a subdomain of ${domain}.`);
}

async function hostinger() {
  const token = process.env.HOSTINGER_API_TOKEN;
  if (!token) throw new Error("HOSTINGER_API_TOKEN is required.");
  const name = hostname.slice(0, -(domain.length + 1));
  const base = `https://developers.hostinger.com/api/dns/v1/zones/${encodeURIComponent(domain)}`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  async function request(path = "", init) {
    const response = await fetch(`${base}${path}`, { ...init, headers });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : undefined;
    if (!response.ok) throw new Error(`Hostinger DNS failed (${response.status}): ${JSON.stringify(payload)}`);
    return payload;
  }
  const groups = await request();
  const sameName = groups.filter((group) => group.name.toLowerCase() === name);
  const conflicts = sameName.filter((group) => group.type.toUpperCase() !== "CNAME");
  if (conflicts.length) throw new Error(`${hostname} already has ${conflicts.map((group) => group.type).join(", ")} records.`);
  const existing = sameName.find((group) => group.type.toUpperCase() === "CNAME");
  const unchanged = existing?.ttl === ttl
    && existing.records.length === 1
    && existing.records[0]?.content.toLowerCase().replace(/\.$/, "") === target
    && existing.records[0]?.is_disabled !== true;
  if (!unchanged) {
    const record = { name, records: [{ content: `${target}.`, is_disabled: false }], ttl, type: "CNAME" };
    await request("/validate", { method: "POST", body: JSON.stringify({ zone: [record] }) });
    await request("", { method: "PUT", body: JSON.stringify({ overwrite: true, zone: [record] }) });
  }
  return { provider: "hostinger", changed: !unchanged, hostname, target };
}

async function cloudflare() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = dns.zoneId || process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are required.");
  const base = `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/dns_records`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  async function request(path = "", init) {
    const response = await fetch(`${base}${path}`, { ...init, headers });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(`Cloudflare DNS failed (${response.status}): ${JSON.stringify(payload.errors)}`);
    }
    return payload.result;
  }
  const records = await request(`?${new URLSearchParams({ name: hostname })}`);
  const conflicts = records.filter((record) => record.type !== "CNAME");
  if (conflicts.length) throw new Error(`${hostname} already has ${conflicts.map((record) => record.type).join(", ")} records.`);
  const existing = records.find((record) => record.type === "CNAME");
  const unchanged = existing?.content.toLowerCase().replace(/\.$/, "") === target
    && existing?.proxied === false
    && existing?.ttl === ttl;
  if (!unchanged) {
    const body = JSON.stringify({ type: "CNAME", name: hostname, content: target, ttl, proxied: false, comment: "Managed by Ribbon" });
    await request(existing ? `/${existing.id}` : "", { method: existing ? "PATCH" : "POST", body });
  }
  return { provider: "cloudflare", changed: !unchanged, hostname, target };
}

const result = dns.provider === "hostinger"
  ? await hostinger()
  : dns.provider === "cloudflare"
    ? await cloudflare()
    : (() => { throw new Error(`Unsupported DNS provider: ${dns.provider}`); })();
console.log(JSON.stringify(result));
