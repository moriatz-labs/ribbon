import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { ConsoleProject } from "../types";
import { IconButton } from "./IconButton";

function label(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

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
        {[
          project.providers.dns,
          project.providers.deployment,
          project.providers.backend,
          project.providers.mail,
          project.providers.designSystem ? "design-system" : undefined
        ].filter((provider): provider is string => Boolean(provider)).map((provider) => (
          <span className="provider connected" key={provider}>
            <Check aria-hidden="true" size={13} />
            {label(provider)}
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

