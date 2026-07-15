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
      vercel: true,
      supabase: true,
      cloudflare: false,
      designSystem: true
    },
    urls: {
      production: "https://vscd.vercel.app",
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
      vercel: true,
      supabase: true,
      cloudflare: false,
      designSystem: true
    },
    urls: {
      production: "https://people-aggregator.vercel.app",
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
  providers: ConsoleProject["providers"];
  urls: ConsoleProject["urls"];
  updated_at: string;
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
    providers: project.providers,
    urls: project.urls,
    updatedAt: project.updated_at
  }));
}
