import { Check, Copy, ExternalLink, Minus } from "lucide-react";
import { useState } from "react";
import type { ConsoleProject } from "../types";
import { IconButton } from "./IconButton";

const providerLabels: Array<[keyof ConsoleProject["providers"], string]> = [
  ["vercel", "Vercel"],
  ["supabase", "Supabase"],
  ["cloudflare", "Cloudflare"],
  ["designSystem", "Design"]
];

export function ProjectCard({ project }: { project: ConsoleProject }) {
  const [copied, setCopied] = useState(false);
  const url = project.urls.production ?? project.urls.preview;

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="project-card">
      <header className="project-card-header">
        <div>
          <div className="status-row">
            <span className={`status-dot status-${project.status}`} />
            <span>{project.status}</span>
          </div>
          <h3>{project.name}</h3>
          <code>{project.slug}</code>
        </div>
        <div className="project-actions">
          {url ? <IconButton icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy URL"} onClick={copyUrl} /> : null}
          {url ? (
            <a className="icon-button" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${project.name}`}>
              <ExternalLink aria-hidden="true" size={17} />
            </a>
          ) : null}
        </div>
      </header>

      <p className="project-description">{project.description}</p>

      <div className="provider-list" aria-label="Provider connections">
        {providerLabels.map(([key, label]) => (
          <span className={project.providers[key] ? "provider connected" : "provider"} key={key}>
            {project.providers[key] ? <Check aria-hidden="true" size={13} /> : <Minus aria-hidden="true" size={13} />}
            {label}
          </span>
        ))}
      </div>

      <footer className="project-footer">
        <span>{url ?? "No deployment URL yet"}</span>
        <span>{project.status === "local" ? "Local only" : "Synced"}</span>
      </footer>
    </article>
  );
}

