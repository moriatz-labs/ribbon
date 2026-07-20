import { Flex } from "@paul/ui-core/marketing";
import { ArrowRightIcon, MonitorIcon } from "@paul/ui-icons";
import { ClosingPanel, MarketingActionLink, MarketingSection } from "@paul/ui-patterns/marketing";

export function ClosingSection() {
  return (
    <MarketingSection>
      <ClosingPanel
        eyebrow="One control plane"
        title="Build the product without binding it to the first stack."
        description="Start with the default providers, keep every boundary explicit, and replace one capability when the product needs to move."
      >
        <Flex gap="$3" wrap="wrap">
          <MarketingActionLink action={{ label: "Open console", href: "/console", icon: <MonitorIcon aria-hidden="true" /> }} />
          <MarketingActionLink action={{ label: "Review the workflow", href: "#workflow", variant: "outline", icon: <ArrowRightIcon aria-hidden="true" /> }} />
        </Flex>
      </ClosingPanel>
    </MarketingSection>
  );
}
