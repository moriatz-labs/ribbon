import { Heading, Stack, Text } from "@paul/ui-core/marketing";
import { CloudIcon, DatabaseIcon, GlobeIcon, MailIcon } from "@paul/ui-icons";
import { BentoGrid, MarketingSection } from "@paul/ui-patterns/marketing";
import { PROVIDER_CAPABILITIES } from "../constants";

const providerIcons = {
  dns: <GlobeIcon aria-hidden="true" />,
  backend: <DatabaseIcon aria-hidden="true" />,
  deployment: <CloudIcon aria-hidden="true" />,
  mail: <MailIcon aria-hidden="true" />,
} as const;

export function ProvidersSection() {
  return (
    <MarketingSection id="providers">
      <Stack gap="$10">
        <Stack gap="$3" css={{ maxWidth: "$reading", marginInline: "auto", textAlign: "center" }}>
          <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Capability slots</Text>
          <Heading size="h2" css={{ fontSize: "$2xl", lineHeight: "$tight", "@md": { fontSize: "$3xl" } }}>
            Change one provider without redrawing the product.
          </Heading>
          <Text size="lg" css={{ color: "$mutedForeground" }}>
            Every slot owns one operational contract, so infrastructure choices stay explicit and the application stays provider-neutral.
          </Text>
        </Stack>
        <BentoGrid
          label="Provider capabilities"
          items={PROVIDER_CAPABILITIES.map((capability) => ({
            id: capability.id,
            eyebrow: `${capability.defaultProvider} / ${capability.alternativeProvider}`,
            title: capability.label,
            description: capability.role,
            icon: providerIcons[capability.id],
            size: capability.id === "dns" || capability.id === "mail" ? "wide" : undefined,
          }))}
        />
      </Stack>
    </MarketingSection>
  );
}
