import { MarketingActionLink, MarketingNav } from "@paul/ui-patterns/marketing";

export function LandingHeader() {
  return (
    <MarketingNav
      brand={<MarketingActionLink action={{ label: "VSCD", href: "/", variant: "ghost" }} />}
      items={[
        { label: "Providers", href: "#providers" },
        { label: "Workflow", href: "#workflow" },
        { label: "Manifest", href: "#manifest" },
      ]}
      action={{ label: "Open console", href: "/console" }}
    />
  );
}
