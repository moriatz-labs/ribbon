import { Box, Text } from "@paul/ui-core";
import { ArrowRightIcon, GitHubIcon } from "@paul/ui-icons";
import { MediaFrame, ProductHero } from "@paul/ui-patterns/marketing";

export function HeroSection() {
  return (
    <ProductHero
      eyebrow="Provider-composable delivery"
      title="Ship the product. Keep every provider replaceable."
      description="VSCD turns DNS, backend, deployment, mail, and Paul’s design system into one manifest that agents can scaffold, verify, and release."
      actions={[
        { label: "Read the manifest", href: "#manifest", icon: <ArrowRightIcon aria-hidden="true" size={18} /> },
        { label: "View source", href: "https://github.com/Paul-M-Kallarackal/VSCD", external: true, variant: "outline", icon: <GitHubIcon aria-hidden="true" size={18} /> },
      ]}
      facts={[
        { label: "Start", value: "pnpm vscd init my-app" },
        { label: "Contract", value: "vscd.json" },
        { label: "Release", value: "GitHub Actions" },
      ]}
      media={(
        <MediaFrame wide>
          <img
            src="/images/vscd-switchboard.webp"
            alt="A tactile modular switchboard routing four capability lanes into replaceable provider blocks."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <Box as="figcaption" css={{ borderTop: "$subtle solid $border", padding: "$4 $5" }}>
            <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono" }}>
              One control plane. Four independent capability contracts.
            </Text>
          </Box>
        </MediaFrame>
      )}
    />
  );
}
