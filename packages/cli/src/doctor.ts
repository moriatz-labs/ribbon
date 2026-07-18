import { getProviderDefinition } from "@vscd/core";
import { runCommand } from "./process.js";

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

export interface DoctorProfile {
  dns: "hostinger" | "cloudflare";
  backend: "supabase" | "firebase";
  deployment: "vercel" | "netlify";
}

async function commandCheck(name: string, args: string[], required = true): Promise<DoctorCheck> {
  const result = await runCommand(name, args);
  return {
    name: `${name} CLI`,
    ok: result.code === 0,
    detail: result.stdout.split(/\r?\n/)[0] || result.stderr.split(/\r?\n/)[0] || "not found",
    required
  };
}

function environmentCheck(name: string, variables: readonly string[], required: boolean): DoctorCheck {
  const missing = variables.filter((variable) => !process.env[variable]);
  return {
    name,
    ok: missing.length === 0,
    detail: missing.length === 0 ? "configured" : `missing ${missing.join(", ")}`,
    required
  };
}

export async function runDoctor(profile: DoctorProfile = {
  dns: "hostinger",
  backend: "supabase",
  deployment: "vercel"
}) {
  const deploymentCli = profile.deployment === "vercel" ? "vercel" : "netlify";
  const backendCli = profile.backend === "supabase" ? "supabase" : "firebase";
  const checks = await Promise.all([
    commandCheck("node", ["--version"]),
    commandCheck("pnpm", ["--version"]),
    commandCheck("git", ["--version"]),
    commandCheck(deploymentCli, ["--version"]),
    commandCheck(backendCli, ["--version"])
  ]);

  const deploymentAuth = profile.deployment === "vercel"
    ? await runCommand("vercel", ["whoami"])
    : await runCommand("netlify", ["status", "--json"]);
  const backendAuth = profile.backend === "supabase"
    ? await runCommand("supabase", ["projects", "list", "--output", "json"])
    : await runCommand("firebase", ["projects:list", "--json"]);

  checks.push(
    {
      name: `${getProviderDefinition("deployment", profile.deployment).displayName} authentication`,
      ok: deploymentAuth.code === 0,
      detail: deploymentAuth.code === 0 ? "authenticated" : deploymentAuth.stderr || "not authenticated",
      required: true
    },
    {
      name: `${getProviderDefinition("backend", profile.backend).displayName} authentication`,
      ok: backendAuth.code === 0,
      detail: backendAuth.code === 0 ? "authenticated" : backendAuth.stderr || "not authenticated",
      required: true
    },
    environmentCheck(
      `${getProviderDefinition("dns", profile.dns).displayName} credentials`,
      getProviderDefinition("dns", profile.dns).requiredEnvironment,
      false
    ),
    environmentCheck(
      `${getProviderDefinition("deployment", profile.deployment).displayName} CI contract`,
      getProviderDefinition("deployment", profile.deployment).requiredEnvironment,
      false
    ),
    {
      name: "Hostinger mail",
      ok: Boolean(
        process.env.HOSTINGER_MAIL_API_TOKEN
        && process.env.HOSTINGER_MAILBOX_ID
        && process.env.HOSTINGER_MAIL_FROM
      ),
      detail: process.env.HOSTINGER_MAIL_API_TOKEN
        && process.env.HOSTINGER_MAILBOX_ID
        && process.env.HOSTINGER_MAIL_FROM
        ? "mail API token, mailbox, and sender present"
        : "optional; backend-managed auth email remains available",
      required: false
    },
    {
      name: "Paul design-system commit",
      ok: /^[0-9a-f]{40}$/.test(process.env.DESIGN_SYSTEM_COMMIT ?? ""),
      detail: /^[0-9a-f]{40}$/.test(process.env.DESIGN_SYSTEM_COMMIT ?? "")
        ? `pinned at ${process.env.DESIGN_SYSTEM_COMMIT!.slice(0, 12)}`
        : "missing; remote builds must use an exact 40-character commit",
      required: false
    },
    {
      name: "Paul design-system deploy key",
      ok: Boolean(process.env.DESIGN_SYSTEM_DEPLOY_KEY),
      detail: process.env.DESIGN_SYSTEM_DEPLOY_KEY
        ? "present as a server-only credential"
        : "missing; remote private design-system builds stay disabled",
      required: false
    }
  );

  return {
    profile,
    ok: checks.every((check) => check.ok || !check.required),
    checks
  };
}
