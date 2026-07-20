import { ArrowRightIcon, MonitorIcon } from "@paul/ui-icons";
import { MediaFrame, ProductHero } from "@paul/ui-patterns/marketing";

export function HeroSection() {
  return (
    <ProductHero
      eyebrow="Provider-composable delivery"
      title="Ship the product. Keep the stack replaceable."
      description="VSCD gives agents one manifest for DNS, backend, deployment, mail, and the shared design system—then verifies the boundaries before release."
      actions={[
        { label: "Read the manifest", href: "#manifest", icon: <ArrowRightIcon aria-hidden="true" /> },
        { label: "Open console", href: "/console", variant: "outline", icon: <MonitorIcon aria-hidden="true" /> },
      ]}
      facts={[
        { label: "Contract", value: "1 manifest" },
        { label: "Capabilities", value: "4 slots" },
        { label: "Release", value: "Reviewed" },
      ]}
      media={
        <MediaFrame wide>
          <img
            src="/images/vscd-switchboard.webp"
            alt="A tactile modular switchboard routing four capability lanes into replaceable provider blocks."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
        </MediaFrame>
      }
    />
  );
}
