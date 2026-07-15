export interface SupabaseProjectSummary {
  id: string;
  ref: string;
  name: string;
  organization_slug?: string;
  region?: string;
  status?: string;
}

export interface CreateSupabaseProjectInput {
  name: string;
  organizationSlug: string;
  dbPassword: string;
  regionSelection?: {
    type: "specific";
    code: string;
  };
}

export class SupabaseManagementClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.supabase.com"
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase Management API failed (${response.status}): ${await response.text()}`);
    }

    return (await response.json()) as T;
  }

  listProjects() {
    return this.request<SupabaseProjectSummary[]>("/v1/projects");
  }

  createProject(input: CreateSupabaseProjectInput) {
    return this.request<SupabaseProjectSummary>("/v1/projects", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        organization_slug: input.organizationSlug,
        db_pass: input.dbPassword,
        region_selection: input.regionSelection
      })
    });
  }
}

