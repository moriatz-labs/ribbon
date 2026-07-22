import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

export const defaultCredentialsPath = join(homedir(), ".vscd", "credentials.env");

function assertSingleLine(value: string, name: string) {
  if (!value.trim() || /[\r\n]/.test(value)) {
    throw new Error(`${name} must be a non-empty single-line value.`);
  }
}

export function loadVscdCredentials(
  path = process.env.VSCD_CREDENTIALS_PATH ?? defaultCredentialsPath
) {
  if (existsSync(path)) loadEnvFile(path);
  return path;
}

async function readCredentialValues(path: string) {
  const values = new Map<string, string>();
  if (!existsSync(path)) return values;
  const source = await readFile(path, "utf8");
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return values;
}

async function writeCredentialValues(path: string, values: Map<string, string>) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${[...values].map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
    { encoding: "utf8", mode: 0o600 }
  );
}

export async function saveHostingerCredentials({
  token,
  domain,
  mailApiToken,
  mailboxId,
  mailFrom,
  path = process.env.VSCD_CREDENTIALS_PATH ?? defaultCredentialsPath
}: {
  token: string;
  domain: string;
  mailApiToken?: string;
  mailboxId?: string;
  mailFrom?: string;
  path?: string;
}) {
  assertSingleLine(token, "HOSTINGER_API_TOKEN");
  assertSingleLine(domain, "HOSTINGER_DOMAIN");
  const mailValues = [mailApiToken, mailboxId, mailFrom];
  const hasAnyMailValue = mailValues.some(Boolean);
  const hasAllMailValues = mailValues.every(Boolean);
  if (hasAnyMailValue && !hasAllMailValues) {
    throw new Error(
      "HOSTINGER_MAIL_API_TOKEN, HOSTINGER_MAILBOX_ID, and HOSTINGER_MAIL_FROM must be imported together."
    );
  }
  if (hasAllMailValues) {
    assertSingleLine(mailApiToken!, "HOSTINGER_MAIL_API_TOKEN");
    assertSingleLine(mailboxId!, "HOSTINGER_MAILBOX_ID");
    assertSingleLine(mailFrom!, "HOSTINGER_MAIL_FROM");
  }
  const values = await readCredentialValues(path);
  values.set("HOSTINGER_API_TOKEN", token.trim());
  values.set("HOSTINGER_DOMAIN", domain.trim().toLowerCase());
  if (hasAllMailValues) {
    values.set("HOSTINGER_MAIL_API_TOKEN", mailApiToken!.trim());
    values.set("HOSTINGER_MAILBOX_ID", mailboxId!.trim());
    values.set("HOSTINGER_MAIL_FROM", mailFrom!.trim().toLowerCase());
  }
  await writeCredentialValues(path, values);
  return path;
}

export async function saveCloudflareCredentials({
  token,
  zoneId,
  domain,
  path = process.env.VSCD_CREDENTIALS_PATH ?? defaultCredentialsPath
}: {
  token: string;
  zoneId: string;
  domain: string;
  path?: string;
}) {
  assertSingleLine(token, "CLOUDFLARE_API_TOKEN");
  assertSingleLine(zoneId, "CLOUDFLARE_ZONE_ID");
  assertSingleLine(domain, "CLOUDFLARE_DOMAIN");
  const values = await readCredentialValues(path);
  values.set("CLOUDFLARE_API_TOKEN", token.trim());
  values.set("CLOUDFLARE_ZONE_ID", zoneId.trim());
  values.set("CLOUDFLARE_DOMAIN", domain.trim().toLowerCase());
  await writeCredentialValues(path, values);
  return path;
}

// Strawn is public, so VSCD stores no design-system repository credentials.
