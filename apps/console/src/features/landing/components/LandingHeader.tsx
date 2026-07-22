import { MarketingActionLink } from "./MarketingActionLink";
import { MarketingNav } from "./MarketingNav";

export function LandingHeader() {
  return (
    <MarketingNav
      brand={<MarketingActionLink action={{ label: "VSCD", href: "/", variant: "ghost" }} />}
      items={[
        { label: "Providers", href: "#providers", variant: "ghost" },
        { label: "Workflow", href: "#workflow", variant: "ghost" },
        { label: "Manifest", href: "#manifest", variant: "ghost" },
      ]}
    />
  );
}
