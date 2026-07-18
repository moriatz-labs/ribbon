import type { ProviderCapability, WorkflowStep } from "./types";

export const PROVIDER_CAPABILITIES: readonly ProviderCapability[] = [
  {
    id: "dns",
    label: "DNS",
    role: "Own the public hostname without silently replacing conflicting records.",
    defaultProvider: "Hostinger",
    alternativeProvider: "Cloudflare",
  },
  {
    id: "backend",
    label: "Backend",
    role: "Keep identity, data, and object authorization behind one adapter boundary.",
    defaultProvider: "Supabase",
    alternativeProvider: "Firebase",
  },
  {
    id: "deployment",
    label: "Deployment",
    role: "Build once, verify the artifact, and release through reviewed automation.",
    defaultProvider: "Vercel",
    alternativeProvider: "Netlify",
  },
  {
    id: "mail",
    label: "Mail",
    role: "Keep sign-in delivery server-side and selected independently from the backend.",
    defaultProvider: "Hostinger Mail",
    alternativeProvider: "Backend managed",
  },
];

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    number: "01",
    title: "Describe the stack",
    description: "Choose a provider for each capability in one versioned manifest.",
    command: "pnpm vscd providers",
  },
  {
    number: "02",
    title: "Generate the product boundary",
    description: "Scaffold only the selected adapters, policy tests, and release workflow.",
    command: "pnpm vscd init my-app",
  },
  {
    number: "03",
    title: "Prove it can ship",
    description: "Run provider-aware checks before a reviewed production release.",
    command: "pnpm vscd check ../my-app",
  },
];

export const MANIFEST_EXAMPLE = `{
  "manifestVersion": 2,
  "name": "My app",
  "providers": {
    "dns": { "provider": "hostinger" },
    "backend": { "provider": "supabase" },
    "deployment": { "provider": "vercel" },
    "mail": { "provider": "hostinger-mail" }
  }
}`;
