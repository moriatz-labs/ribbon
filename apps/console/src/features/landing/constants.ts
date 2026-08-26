import type { WorkflowStep } from "./types";

export const CAPABILITY_LABELS = [
  "DNS",
  "Backend",
  "Deployment",
  "Mail",
  "Strawn",
] as const;

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    number: "01",
    title: "See your options",
    command: "pnpm ribbon providers",
  },
  {
    number: "02",
    title: "Create the app",
    command: "pnpm ribbon init my-app --target ../my-app",
  },
  {
    number: "03",
    title: "Verify the result",
    command: "pnpm ribbon check ../my-app",
  },
];
