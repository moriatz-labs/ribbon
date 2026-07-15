export interface ConsoleProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "local" | "preview" | "production" | "archived";
  providers: {
    vercel: boolean;
    supabase: boolean;
    cloudflare: boolean;
    designSystem: boolean;
  };
  urls: {
    production?: string;
    preview?: string;
    repository?: string;
  };
  updatedAt: string;
}

