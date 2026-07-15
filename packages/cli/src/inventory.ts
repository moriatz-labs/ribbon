import { runCommand } from "./process.js";

function extractJsonArray(output: string) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end < start) {
    return [];
  }
  return JSON.parse(output.slice(start, end + 1)) as unknown[];
}

function extractJsonObject(output: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) {
    return {};
  }
  return JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
}

export async function collectInventory() {
  const [supabase, vercel] = await Promise.all([
    runCommand("supabase", ["projects", "list", "--output", "json"]),
    runCommand("vercel", ["api", "GET", "/v9/projects"])
  ]);

  const vercelPayload = vercel.code === 0 ? extractJsonObject(vercel.stdout) : {};

  return {
    capturedAt: new Date().toISOString(),
    supabase: {
      ok: supabase.code === 0,
      projects: supabase.code === 0 ? extractJsonArray(supabase.stdout) : [],
      error: supabase.code === 0 ? undefined : supabase.stderr
    },
    vercel: {
      ok: vercel.code === 0,
      projects: Array.isArray(vercelPayload.projects) ? vercelPayload.projects : [],
      error: vercel.code === 0 ? undefined : vercel.stderr
    },
    cloudflare: {
      configured: Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID)
    }
  };
}

