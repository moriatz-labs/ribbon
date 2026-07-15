import { runCommand } from "./process.js";

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

async function commandCheck(name: string, args: string[]): Promise<DoctorCheck> {
  const result = await runCommand(name, args);
  return {
    name,
    ok: result.code === 0,
    detail: result.stdout.split(/\r?\n/)[0] || result.stderr.split(/\r?\n/)[0] || "not found",
    required: true
  };
}

export async function runDoctor() {
  const checks = await Promise.all([
    commandCheck("node", ["--version"]),
    commandCheck("pnpm", ["--version"]),
    commandCheck("git", ["--version"]),
    commandCheck("vercel", ["--version"]),
    commandCheck("supabase", ["--version"])
  ]);

  const [vercelAuth, supabaseAuth] = await Promise.all([
    runCommand("vercel", ["whoami"]),
    runCommand("supabase", ["projects", "list", "--output", "json"])
  ]);

  checks.push(
    {
      name: "Vercel authentication",
      ok: vercelAuth.code === 0,
      detail: vercelAuth.stdout || vercelAuth.stderr || "not authenticated",
      required: true
    },
    {
      name: "Supabase authentication",
      ok: supabaseAuth.code === 0 && supabaseAuth.stdout.includes("["),
      detail: supabaseAuth.code === 0 ? "authenticated" : supabaseAuth.stderr || "not authenticated",
      required: true
    },
    {
      name: "Cloudflare API token",
      ok: Boolean(process.env.CLOUDFLARE_API_TOKEN),
      detail: process.env.CLOUDFLARE_API_TOKEN ? "present" : "missing; DNS writes stay disabled",
      required: false
    },
    {
      name: "Cloudflare zone ID",
      ok: Boolean(process.env.CLOUDFLARE_ZONE_ID),
      detail: process.env.CLOUDFLARE_ZONE_ID ? "present" : "missing; domain linking stays disabled",
      required: false
    }
  );

  return {
    ok: checks.every((check) => check.ok || !check.required),
    checks
  };
}

