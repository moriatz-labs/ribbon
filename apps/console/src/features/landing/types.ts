export interface ProviderCapability {
  id: "dns" | "backend" | "deployment" | "mail";
  label: string;
  role: string;
  defaultProvider: string;
  alternativeProvider: string;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  command: string;
}
