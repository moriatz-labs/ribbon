import { MarketingFooter } from "@paul/ui-patterns/marketing";

export function LandingFooter() {
  return (
    <MarketingFooter
      brand="VSCD · A Moriatz project by Paul M Kallarackal"
      links={[
        { label: "Portfolio", href: "https://paul.moriatz.com", external: true },
        { label: "GitHub", href: "https://github.com/Paul-M-Kallarackal/VSCD", external: true },
        { label: "Console", href: "/console" },
      ]}
    />
  );
}
