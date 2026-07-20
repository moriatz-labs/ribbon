import { Text } from "@paul/ui-core/marketing";
import { MarketingNav } from "@paul/ui-patterns/marketing";

export function LandingHeader() {
  return (
    <MarketingNav
      brand={<Text css={{ fontFamily: "$nav", fontWeight: "$semibold" }}>VSCD</Text>}
      items={[
        { label: "Providers", href: "#providers" },
        { label: "Workflow", href: "#workflow" },
        { label: "Manifest", href: "#manifest" },
      ]}
      action={{ label: "Open console", href: "/console" }}
    />
  );
}
