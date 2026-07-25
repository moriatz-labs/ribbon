import type { ProviderCapability, WorkflowStep } from "./types";

export const PROVIDER_CAPABILITIES: readonly ProviderCapability[] = [
  {
    id: "dns",
    label: "DNS",
    role: "Own the public hostname and reject conflicting DNS records.",
    defaultProvider: "Hostinger",
    alternativeProvider: "Cloudflare",
  },
  {
    id: "backend",
    label: "Backend",
    role: "Keep identity, data, and storage behind one provider-neutral boundary.",
    defaultProvider: "Supabase",
    alternativeProvider: "Firebase",
  },
  {
    id: "deployment",
    label: "Deployment",
    role: "Build once, verify once, then deploy the same reviewed artifact.",
    defaultProvider: "Vercel",
    alternativeProvider: "Netlify",
  },
  {
    id: "mail",
    label: "Mail",
    role: "Choose delivery independently and keep every credential server-side.",
    defaultProvider: "Hostinger Mail",
    alternativeProvider: "Backend managed",
  },
];

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    number: "Step 1",
    title: "Describe the stack",
    description: "Choose a provider for each capability in one versioned manifest.",
    command: "pnpm vscd providers",
  },
  {
    number: "Step 2",
    title: "Generate the product boundary",
    description: "Scaffold only the selected adapters, policy tests, and release workflow.",
    command: "pnpm vscd init my-app",
  },
  {
    number: "Step 3",
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
