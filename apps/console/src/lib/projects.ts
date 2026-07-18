import type { ConsoleProject } from "../types";
import { supabase } from "./supabase";

export const localProjects: ConsoleProject[] = [
  {
    id: "vscd-local",
    name: "VSCD",
    slug: "vscd",
    description: "Control plane, scaffolding, provider automation, and release checks.",
    status: "production",
    providers: {
      deployment: "vercel",
      backend: "supabase",
      dns: "hostinger",
      designSystem: true
    },
    urls: {
      production: "https://vscd.moriatz.com",
      repository: "https://github.com/Paul-M-Kallarackal/VSCD"
    },
    updatedAt: "2026-07-15T00:00:00.000Z"
  },
  {
    id: "people-aggregator-local",
    name: "People Aggregator",
    slug: "people-aggregator",
    description: "Editable, evidence-backed people cards and enrichment pipeline.",
    status: "production",
    providers: {
      deployment: "vercel",
      backend: "supabase",
      dns: "hostinger",
      designSystem: true
    },
    urls: {
      production: "https://people.moriatz.com",
      repository: "https://github.com/Paul-M-Kallarackal/people-aggregator"
    },
    updatedAt: "2026-07-15T00:00:00.000Z"
  }
];

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ConsoleProject["status"];
  providers: Record<string, unknown>;
  urls: ConsoleProject["urls"];
  updated_at: string;
}

function providerName(value: unknown) {
  return value && typeof value === "object" && "provider" in value
    && typeof (value as { provider?: unknown }).provider === "string"
    ? (value as { provider: string }).provider
    : undefined;
}

function normalizeProviders(providers: Record<string, unknown>): ConsoleProject["providers"] {
  const deployment = providerName(providers.deployment)
    ?? (providers.vercel ? "vercel" : providers.netlify ? "netlify" : "unconfigured");
  const backend = providerName(providers.backend)
    ?? (providers.supabase ? "supabase" : providers.firebase ? "firebase" : "unconfigured");
  const dns = providerName(providers.dns)
    ?? (providers.hostinger ? "hostinger" : providers.cloudflare ? "cloudflare" : undefined);
  const mail = providerName(providers.mail);
  return {
    deployment,
    backend,
    dns,
    mail,
    designSystem: Boolean(providers.designSystem)
  };
}

export async function loadProjects(): Promise<ConsoleProject[]> {
  if (!supabase) {
    return localProjects;
  }

  const { data, error } = await supabase
    .from("vscd_projects")
    .select("id,name,slug,description,status,providers,urls,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProjectRow[]).map((project) => ({
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? "",
    status: project.status,
    providers: normalizeProviders(project.providers),
    urls: project.urls,
    updatedAt: project.updated_at
  }));
}
