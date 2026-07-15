export interface VercelProjectSummary {
  id: string;
  name: string;
  framework?: string;
  updatedAt?: number;
}

interface VercelProjectsResponse {
  projects: VercelProjectSummary[];
}

export class VercelClient {
  constructor(
    private readonly token: string,
    private readonly teamId?: string,
    private readonly baseUrl = "https://api.vercel.com"
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const teamQuery = this.teamId ? `${separator}teamId=${encodeURIComponent(this.teamId)}` : "";
    const response = await fetch(`${this.baseUrl}${path}${teamQuery}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Vercel API failed (${response.status}): ${await response.text()}`);
    }

    return (await response.json()) as T;
  }

  async listProjects() {
    const result = await this.request<VercelProjectsResponse>("/v9/projects?limit=100");
    return result.projects;
  }

  createProject(name: string) {
    return this.request<VercelProjectSummary>("/v10/projects", {
      method: "POST",
      body: JSON.stringify({ name, framework: "vite" })
    });
  }
}

