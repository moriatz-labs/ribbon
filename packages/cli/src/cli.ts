#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  getProviderDefinition,
  listProviderDefinitions,
  projectManifestSchema,
  readRegistry,
  upsertProject,
  type ProviderCapability,
  type ProjectManifest
} from "@moriatz/ribbon-core";
import { runCodexCheck } from "./check.js";
import {
  loadRibbonCredentials,
  saveCloudflareCredentials,
  saveHostingerCredentials
} from "./credentials.js";
import { provisionDnsCname } from "./dns.js";
import { runDoctor } from "./doctor.js";
import { collectInventory } from "./inventory.js";
import { DEFAULT_STACK, scaffoldProject } from "./scaffold.js";

const registryPath = process.env.RIBBON_REGISTRY_PATH ?? join(homedir(), ".ribbon", "registry.json");
const credentialsPath = loadRibbonCredentials();

function printHelp() {
  console.log(`Ribbon

Default stack: Hostinger DNS + Supabase + Vercel

Commands:
  providers [--json]
  doctor [--dns-provider <id>] [--backend-provider <id>] [--deployment-provider <id>]
  auth <hostinger|cloudflare>
  inventory [--json]
  init <slug> [--title <name>] [--target <path>] [--domain <domain>] [--dns-provider <id>] [--backend-provider <id>] [--deployment-provider <id>] [--no-domain]
  dns [project-path] [--target <hostname>]
  check [project-path] [--json]
  register <manifest-path>
  urls
`);
}

function providerId<T extends ProviderCapability>(
  capability: T,
  value: string | undefined,
  fallback: string
) {
  const id = value ?? fallback;
  getProviderDefinition(capability, id);
  return id;
}

async function readProjectManifest(path = "."): Promise<ProjectManifest> {
  const absolute = isAbsolute(path) ? path : resolve(path);
  const manifestPath = extname(absolute).toLowerCase() === ".json"
    ? absolute
    : join(absolute, "ribbon.json");
  return projectManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
}

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      domain: { type: "string" },
      "no-domain": { type: "boolean", default: false },
      target: { type: "string" },
      title: { type: "string" },
      "dns-provider": { type: "string" },
      "backend-provider": { type: "string" },
      "deployment-provider": { type: "string" },
      "mail-provider": { type: "string" }
    }
  });
  const [command, firstArgument] = positionals;

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "providers") {
    const definitions = listProviderDefinitions();
    if (values.json) {
      console.log(JSON.stringify({ defaultStack: DEFAULT_STACK, providers: definitions }, null, 2));
    } else {
      console.log("Basic stack: Hostinger DNS + Supabase + Vercel\n");
      for (const definition of definitions) {
        console.log(`${definition.capability.padEnd(10)} ${definition.id.padEnd(15)} ${definition.description}`);
      }
    }
    return;
  }

  const dnsProvider = providerId("dns", values["dns-provider"], DEFAULT_STACK.dns) as "hostinger" | "cloudflare";
  const backendProvider = providerId("backend", values["backend-provider"], DEFAULT_STACK.backend) as "supabase" | "firebase";
  const deploymentProvider = providerId("deployment", values["deployment-provider"], DEFAULT_STACK.deployment) as "vercel" | "netlify";

  if (command === "doctor") {
    const result = await runDoctor({ dns: dnsProvider, backend: backendProvider, deployment: deploymentProvider });
    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      for (const check of result.checks) {
        console.log(`${check.ok ? "PASS" : check.required ? "FAIL" : "INFO"}  ${check.name}: ${check.detail}`);
      }
    }
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (command === "inventory") {
    console.log(JSON.stringify(await collectInventory(), null, 2));
    return;
  }

  if (command === "init") {
    if (!firstArgument) throw new Error("Usage: ribbon init <slug> [provider options]");
    const target = values.target
      ? (isAbsolute(values.target) ? values.target : resolve(values.target))
      : resolve(firstArgument);
    const domain = values.domain
      ?? (dnsProvider === "hostinger" ? process.env.HOSTINGER_DOMAIN : process.env.CLOUDFLARE_DOMAIN)
      ?? "moriatz.com";
    const mailProvider = values["mail-provider"] as "hostinger-mail" | "backend" | undefined;
    if (mailProvider) getProviderDefinition("mail", mailProvider);
    await scaffoldProject(firstArgument, target, {
      title: values.title,
      domain,
      dnsProvider,
      backendProvider,
      deploymentProvider,
      mailProvider
    });
    console.log(`Scaffolded ${firstArgument} at ${target}`);

    if (!values["no-domain"]) {
      try {
        const dns = await provisionDnsCname({ manifest: await readProjectManifest(target) });
        console.log(`${dns.changed ? "Created" : "Verified"} ${dns.provider} CNAME ${dns.hostname} -> ${dns.target}`);
      } catch (error) {
        console.log(`Skipped DNS: ${error instanceof Error ? error.message : error}`);
      }
    }
    return;
  }

  if (command === "auth") {
    if (firstArgument === "cloudflare") {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      const zoneId = process.env.CLOUDFLARE_ZONE_ID;
      const domain = values.domain ?? process.env.CLOUDFLARE_DOMAIN;
      if (!token || !zoneId || !domain) {
        throw new Error("CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, and CLOUDFLARE_DOMAIN must be present.");
      }
      await saveCloudflareCredentials({ token, zoneId, domain, path: credentialsPath });
      console.log(`Stored Cloudflare credentials in ${credentialsPath}`);
      return;
    }
    if (firstArgument !== "hostinger") {
      throw new Error("Usage: ribbon auth <hostinger|cloudflare>");
    }
    const token = process.env.HOSTINGER_API_TOKEN;
    const domain = values.domain ?? process.env.HOSTINGER_DOMAIN;
    if (!token || !domain) {
      throw new Error("HOSTINGER_API_TOKEN and HOSTINGER_DOMAIN must be present to import credentials.");
    }
    await saveHostingerCredentials({
      token,
      domain,
      mailApiToken: process.env.HOSTINGER_MAIL_API_TOKEN,
      mailboxId: process.env.HOSTINGER_MAILBOX_ID,
      mailFrom: process.env.HOSTINGER_MAIL_FROM,
      path: credentialsPath
    });
    console.log(`Stored Hostinger credentials in ${credentialsPath}`);
    return;
  }

  if (command === "dns") {
    const manifest = await readProjectManifest(firstArgument ?? ".");
    const dns = await provisionDnsCname({ manifest, target: values.target });
    console.log(JSON.stringify(dns, null, values.json ? 2 : undefined));
    return;
  }

  if (command === "check") {
    const root = resolve(firstArgument ?? ".");
    const checks = await runCodexCheck(root);
    if (values.json) {
      console.log(JSON.stringify(checks, null, 2));
    } else {
      for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.id}: ${check.detail}`);
    }
    process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
    return;
  }

  if (command === "register") {
    if (!firstArgument) throw new Error("Usage: ribbon register <manifest-path>");
    const manifest = projectManifestSchema.parse(JSON.parse(await readFile(resolve(firstArgument), "utf8")));
    await upsertProject(registryPath, manifest);
    console.log(`Registered ${manifest.slug} in ${registryPath}`);
    return;
  }

  if (command === "urls") {
    const registry = await readRegistry(registryPath);
    for (const project of registry.projects) {
      console.log(`${project.slug}\t${project.urls.production ?? project.urls.preview ?? project.urls.local ?? "no URL"}`);
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
