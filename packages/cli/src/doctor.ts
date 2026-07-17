import { runCommand } from "./process.js";

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

async function commandCheck(name: string, args: string[], required = true): Promise<DoctorCheck> {
  const result = await runCommand(name, args);
  return {
    name,
    ok: result.code === 0,
    detail: result.stdout.split(/\r?\n/)[0] || result.stderr.split(/\r?\n/)[0] || "not found",
    required
  };
}

export async function runDoctor() {
  const checks = await Promise.all([
    commandCheck("node", ["--version"]),
    commandCheck("pnpm", ["--version"]),
    commandCheck("git", ["--version"]),
    commandCheck("vercel", ["--version"]),
    commandCheck("supabase", ["--version"]),
    commandCheck("hostinger", ["version"], false)
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
    },
    {
      name: "Hostinger API token",
      ok: Boolean(process.env.HOSTINGER_API_TOKEN),
      detail: process.env.HOSTINGER_API_TOKEN ? "present" : "missing; Hostinger DNS writes stay disabled",
      required: false
    },
    {
      name: "Hostinger domain",
      ok: Boolean(process.env.HOSTINGER_DOMAIN),
      detail: process.env.HOSTINGER_DOMAIN ?? "missing; automatic subdomains stay disabled",
      required: false
    },
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
        : "missing; generated apps require manual Hostinger mail environment setup",
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
    ok: checks.every((check) => check.ok || !check.required),
    checks
  };
}

