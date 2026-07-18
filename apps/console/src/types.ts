export interface ConsoleProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "local" | "preview" | "production" | "archived";
  providers: {
    deployment: string;
    backend: string;
    dns?: string;
    mail?: string;
    designSystem: boolean;
  };
  urls: {
    production?: string;
    preview?: string;
    repository?: string;
  };
  updatedAt: string;
}

