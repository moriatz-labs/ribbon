#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { projectManifestSchema, readRegistry, upsertProject } from "@vscd/core";
import { runCodexCheck } from "./check.js";
import { runDoctor } from "./doctor.js";
import { collectInventory } from "./inventory.js";
import { scaffoldProject } from "./scaffold.js";

const registryPath = process.env.VSCD_REGISTRY_PATH ?? join(homedir(), ".vscd", "registry.json");

function printHelp() {
  console.log(`VSCD\n\nCommands:\n  doctor\n  inventory [--json]\n  init <slug> [--title <name>] [--target <path>]\n  check [project-path] [--json]\n  register <manifest-path>\n  urls\n`);
}

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      target: { type: "string" },
      title: { type: "string" }
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
    await scaffoldProject(firstArgument, target, values.title);
    console.log(`Scaffolded ${firstArgument} at ${target}`);
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

