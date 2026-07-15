import { Cloud, Database, LayoutTemplate, Triangle } from "lucide-react";

const runtimeNodes = [
  { name: "Cloudflare", role: "DNS", icon: Cloud },
  { name: "Vercel", role: "Runtime", icon: Triangle },
  { name: "Supabase", role: "Data", icon: Database }
];

export function RouteRail() {
  return (
    <section className="route-rail" aria-labelledby="route-heading">
      <div className="route-copy">
        <p className="eyebrow">Request path</p>
        <h2 id="route-heading">One route. Clear ownership.</h2>
        <p>Cloudflare resolves the hostname. Vercel serves the app. Supabase authorizes every data row.</p>
      </div>

      <div className="route-track">
        {runtimeNodes.map(({ name, role, icon: Icon }, index) => (
          <div className="route-node-wrap" key={name}>
            <div className="route-node">
              <Icon aria-hidden="true" size={20} />
              <div>
                <strong>{name}</strong>
                <span>{role}</span>
              </div>
            </div>
            {index < runtimeNodes.length - 1 ? <span className="route-line" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>

      <div className="build-input">
        <LayoutTemplate aria-hidden="true" size={18} />
        <div>
          <strong>Design system</strong>
          <span>Build-time input</span>
        </div>
      </div>
    </section>
  );
}

