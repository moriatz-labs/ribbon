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

export interface MarketingAction {
  label: string;
  href: string;
  external?: boolean;
  variant?: "solid" | "outline" | "ghost";
  icon?: ReactNode;
}

export interface CodeSnippet {
  id: string;
  label: string;
  language: string;
  code: string;
}
import type { ReactNode } from "react";
