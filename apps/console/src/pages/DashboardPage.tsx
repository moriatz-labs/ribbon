import { CheckCircle2, CircleDot, Command, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "../components/IconButton";
import { ProjectCard } from "../components/ProjectCard";
import { RouteRail } from "../components/RouteRail";
import { loadProjects } from "../lib/projects";
import { hasSupabaseConfig } from "../lib/supabase";
import type { ConsoleProject } from "../types";

interface DashboardPageProps {
  userEmail?: string;
  onSignOut?: () => Promise<unknown>;
}

export function DashboardPage({ userEmail, onSignOut }: DashboardPageProps) {
  const [projects, setProjects] = useState<ConsoleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await loadProjects());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Project registry could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const connected = projects.filter((project) => project.status === "production" || project.status === "preview").length;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="VSCD home">VSCD</a>
        <nav aria-label="Primary navigation">
          <a className="nav-link active" href="#projects"><CircleDot aria-hidden="true" size={18} />Projects</a>
          <a className="nav-link" href="#workflow"><Command aria-hidden="true" size={18} />Workflow</a>
        </nav>
        <div className="sidebar-foot">
          <span className={hasSupabaseConfig ? "connection connected" : "connection"}>
            <span className="connection-dot" />
            {hasSupabaseConfig ? "Registry connected" : "Blueprint mode"}
          </span>
        </div>
      </aside>

      <main id="main-content" className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Control plane</p>
            <h1>Every side project, in one place.</h1>
            <p>Composable provider stacks, release readiness, and the URL you actually need.</p>
          </div>
          <div className="header-action">
            <IconButton icon={RefreshCw} label="Refresh projects" onClick={() => void refresh()} disabled={loading} />
            {onSignOut ? <IconButton icon={LogOut} label={`Sign out${userEmail ? ` ${userEmail}` : ""}`} onClick={() => void onSignOut()} /> : null}
            <div className="command-chip"><code>pnpm vscd init project-name</code></div>
          </div>
        </header>

        <RouteRail />

        <section className="summary-strip" aria-label="Project summary">
          <div><strong>{projects.length}</strong><span>Tracked projects</span></div>
          <div><strong>{connected}</strong><span>With a live URL</span></div>
          <div><strong>{projects.filter((project) => project.providers.designSystem).length}</strong><span>Using your design system</span></div>
        </section>

        <section id="projects" className="projects-section" aria-labelledby="projects-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Registry</p>
              <h2 id="projects-heading">Projects</h2>
            </div>
            <span><CheckCircle2 aria-hidden="true" size={16} />Codex checks required before release</span>
          </div>

          {error ? <div className="error-state" role="alert"><strong>Registry unavailable.</strong><span>{error}</span></div> : null}
          {loading ? <div className="loading-state">Loading registry...</div> : null}
          {!loading && !error ? (
            <div className="project-grid">
              {projects.map((project) => <ProjectCard project={project} key={project.id} />)}
            </div>
          ) : null}
        </section>

        <section id="workflow" className="workflow-section" aria-labelledby="workflow-heading">
          <div>
            <p className="eyebrow">Reusable workflow</p>
            <h2 id="workflow-heading">Ask for the product. VSCD handles the path.</h2>
          </div>
          <ol>
            <li><span>1</span><div><strong>Build</strong><p>Codex applies the scaffold and your design system.</p></div></li>
            <li><span>2</span><div><strong>Check</strong><p>Types, tests, secrets, provider security rules, and release policy are verified.</p></div></li>
            <li><span>3</span><div><strong>Release</strong><p>GitHub Actions uses the selected deployment adapter and records its URL.</p></div></li>
          </ol>
        </section>
      </main>
    </div>
  );
}
