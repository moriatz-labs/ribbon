const required = ["HOSTINGER_API_TOKEN", "HOSTINGER_DOMAIN", "CUSTOM_DOMAIN"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}

const token = process.env.HOSTINGER_API_TOKEN;
const domain = process.env.HOSTINGER_DOMAIN.toLowerCase().replace(/\.$/, "");
const hostname = process.env.CUSTOM_DOMAIN.toLowerCase().replace(/\.$/, "");
const target = (process.env.VERCEL_CNAME_TARGET || "cname.vercel-dns.com")
  .toLowerCase()
  .replace(/\.$/, "");

if (hostname === domain || !hostname.endsWith(`.${domain}`)) {
  throw new Error(`CUSTOM_DOMAIN must be a subdomain of ${domain}`);
}

const name = hostname.slice(0, -(domain.length + 1));
const base = `https://developers.hostinger.com/api/dns/v1/zones/${encodeURIComponent(domain)}`;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

async function request(path = "", init) {
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new Error(`Hostinger DNS failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

const groups = await request();
const sameName = groups.filter((group) => group.name.toLowerCase() === name);
const conflicts = sameName.filter((group) => group.type.toUpperCase() !== "CNAME");
if (conflicts.length > 0) {
  throw new Error(`${hostname} already has ${conflicts.map((group) => group.type).join(", ")} records`);
}

const existing = sameName.find((group) => group.type.toUpperCase() === "CNAME");
const unchanged =
  existing?.ttl === 300 &&
  existing.records.length === 1 &&
  existing.records[0]?.content.toLowerCase().replace(/\.$/, "") === target &&
  existing.records[0]?.is_disabled !== true;

if (!unchanged) {
  const record = {
    name,
    records: [{ content: `${target}.`, is_disabled: false }],
    ttl: 300,
    type: "CNAME"
  };
  await request("/validate", {
    method: "POST",
    body: JSON.stringify({ zone: [record] })
  });
  await request("", {
    method: "PUT",
    body: JSON.stringify({ overwrite: true, zone: [record] })
  });
}

console.log(JSON.stringify({ changed: !unchanged, hostname, target, provider: "hostinger" }));
