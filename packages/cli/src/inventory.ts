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
  const [supabase, firebase, netlify, vercelTeams, personalProjects] = await Promise.all([
    runCommand("supabase", ["projects", "list", "--output", "json"]),
    runCommand("firebase", ["projects:list", "--json"]),
    runCommand("netlify", ["sites:list", "--json"]),
    runCommand("vercel", ["api", "/v2/teams", "--raw"]),
    runCommand("vercel", ["api", "/v9/projects", "--raw"])
  ]);

  const teamPayload = vercelTeams.code === 0 ? extractJsonObject(vercelTeams.stdout) : {};
  const teams = Array.isArray(teamPayload.teams)
    ? teamPayload.teams.filter((team): team is Record<string, unknown> => Boolean(team) && typeof team === "object")
    : [];
  const teamProjectResults = await Promise.all(
    teams
      .map((team) => typeof team.id === "string" ? team.id : undefined)
      .filter((id): id is string => Boolean(id))
      .map((id) => runCommand("vercel", ["api", `/v9/projects?teamId=${id}`, "--raw"]))
  );
  const projectResults = [personalProjects, ...teamProjectResults];
  const projectMap = new Map<string, Record<string, unknown>>();

  for (const result of projectResults) {
    if (result.code !== 0) continue;
    const payload = extractJsonObject(result.stdout);
    if (!Array.isArray(payload.projects)) continue;
    for (const value of payload.projects) {
      if (!value || typeof value !== "object") continue;
      const project = value as Record<string, unknown>;
      if (typeof project.id !== "string") continue;
      projectMap.set(project.id, {
        id: project.id,
        name: project.name,
        accountId: project.accountId,
        framework: project.framework,
        updatedAt: project.updatedAt,
        hasDeployments: project.hasDeployments
      });
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    supabase: {
      ok: supabase.code === 0,
      projects: supabase.code === 0 ? extractJsonArray(supabase.stdout) : [],
      error: supabase.code === 0 ? undefined : supabase.stderr
    },
    firebase: {
      ok: firebase.code === 0,
      projects: firebase.code === 0
        ? (extractJsonObject(firebase.stdout).results ?? [])
        : [],
      error: firebase.code === 0 ? undefined : firebase.stderr
    },
    vercel: {
      ok: vercelTeams.code === 0 && projectResults.every((result) => result.code === 0),
      teams: teams.map((team) => ({ id: team.id, slug: team.slug, name: team.name })),
      projects: [...projectMap.values()],
      error: projectResults.find((result) => result.code !== 0)?.stderr
    },
    netlify: {
      ok: netlify.code === 0,
      sites: netlify.code === 0 ? extractJsonArray(netlify.stdout) : [],
      error: netlify.code === 0 ? undefined : netlify.stderr
    },
    cloudflare: {
      configured: Boolean(
        process.env.CLOUDFLARE_API_TOKEN
        && process.env.CLOUDFLARE_ZONE_ID
        && process.env.CLOUDFLARE_DOMAIN
      ),
      domain: process.env.CLOUDFLARE_DOMAIN
    },
    hostinger: {
      configured: Boolean(process.env.HOSTINGER_API_TOKEN && process.env.HOSTINGER_DOMAIN),
      domain: process.env.HOSTINGER_DOMAIN
    }
  };
}

