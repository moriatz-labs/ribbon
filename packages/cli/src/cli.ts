#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { projectManifestSchema, readRegistry, upsertProject } from "@vscd/core";
import { runCodexCheck } from "./check.js";
import { loadVscdCredentials, saveDesignSystemCredentials, saveHostingerCredentials } from "./credentials.js";
import { DEFAULT_VERCEL_CNAME_TARGET, provisionHostingerCname } from "./dns.js";
import { runDoctor } from "./doctor.js";
import { collectInventory } from "./inventory.js";
import { scaffoldProject } from "./scaffold.js";

const registryPath = process.env.VSCD_REGISTRY_PATH ?? join(homedir(), ".vscd", "registry.json");
const credentialsPath = loadVscdCredentials();

function printHelp() {
  console.log(`VSCD\n\nCommands:\n  doctor\n  auth hostinger\n  auth design-system\n  inventory [--json]\n  init <slug> [--title <name>] [--target <path>] [--domain <domain>] [--no-domain]\n  dns <subdomain> [--domain <domain>] [--target <hostname>]\n  check [project-path] [--json]\n  register <manifest-path>\n  urls\n`);
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
      cname: { type: "string" }
    }
  });
  const [command, firstArgument] = positionals;

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "doctor") {
    const result = await runDoctor();
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
    const inventory = await collectInventory();
    console.log(JSON.stringify(inventory, null, 2));
    return;
  }

  if (command === "init") {
    if (!firstArgument) {
      throw new Error("Usage: vscd init <slug> [--title <name>] [--target <path>]");
    }
    const target = values.target
      ? (isAbsolute(values.target) ? values.target : resolve(values.target))
      : resolve(firstArgument);
    const domain = values.domain ?? process.env.HOSTINGER_DOMAIN ?? "moriatz.com";
    await scaffoldProject(firstArgument, target, values.title, domain);
    console.log(`Scaffolded ${firstArgument} at ${target}`);

    if (!values["no-domain"]) {
      if (process.env.HOSTINGER_API_TOKEN) {
        const dns = await provisionHostingerCname({
          token: process.env.HOSTINGER_API_TOKEN,
          domain,
          name: firstArgument,
          target: values.cname ?? DEFAULT_VERCEL_CNAME_TARGET
        });
        console.log(`${dns.changed ? "Created" : "Verified"} CNAME ${dns.hostname} -> ${dns.target}`);
      } else {
        console.log("Skipped DNS: HOSTINGER_API_TOKEN is not configured. Run `vscd dns` after adding it.");
      }
    }
    return;
  }

  if (command === "auth") {
    if (firstArgument === "design-system") {
      const deployKey = process.env.DESIGN_SYSTEM_DEPLOY_KEY;
      const commit = process.env.DESIGN_SYSTEM_COMMIT;
      if (!deployKey || !commit) {
        throw new Error("DESIGN_SYSTEM_DEPLOY_KEY and DESIGN_SYSTEM_COMMIT must be present to import credentials.");
      }
      await saveDesignSystemCredentials({ deployKey, commit, path: credentialsPath });
      console.log(`Stored Paul design-system credentials in ${credentialsPath}`);
      return;
    }
    if (firstArgument !== "hostinger") {
      throw new Error("Usage: vscd auth <hostinger|design-system>");
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
    if (!firstArgument) {
      throw new Error("Usage: vscd dns <subdomain> [--domain <domain>] [--target <hostname>]");
    }
    const token = process.env.HOSTINGER_API_TOKEN;
    const domain = values.domain ?? process.env.HOSTINGER_DOMAIN;
    if (!token || !domain) {
      throw new Error("HOSTINGER_API_TOKEN and HOSTINGER_DOMAIN are required for DNS provisioning.");
    }

    const dns = await provisionHostingerCname({
      token,
      domain,
      name: firstArgument,
      target: values.target ?? DEFAULT_VERCEL_CNAME_TARGET
    });
    console.log(JSON.stringify(dns, null, values.json ? 2 : undefined));
    return;
  }

  if (command === "check") {
    const root = resolve(firstArgument ?? ".");
    const checks = await runCodexCheck(root);
    if (values.json) {
      console.log(JSON.stringify(checks, null, 2));
    } else {
      for (const check of checks) {
        console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.id}: ${check.detail}`);
      }
    }
    process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
    return;
  }

  if (command === "register") {
    if (!firstArgument) {
      throw new Error("Usage: vscd register <manifest-path>");
    }
    const manifest = projectManifestSchema.parse(
      JSON.parse(await readFile(resolve(firstArgument), "utf8"))
    );
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

