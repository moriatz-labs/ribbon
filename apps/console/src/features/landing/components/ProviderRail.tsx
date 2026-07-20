import { Box, Flex, Heading, Text } from "@paul/ui-core";
import { CloudIcon, DatabaseIcon, GlobeIcon, MailIcon } from "@paul/ui-icons";
import type { ProviderCapability } from "../types";

function capabilityIcon(id: ProviderCapability["id"]) {
  if (id === "dns") return <GlobeIcon aria-hidden="true" size={20} />;
  if (id === "backend") return <DatabaseIcon aria-hidden="true" size={20} />;
  if (id === "deployment") return <CloudIcon aria-hidden="true" size={20} />;
  return <MailIcon aria-hidden="true" size={20} />;
}

export function ProviderRail({ capability, index }: { capability: ProviderCapability; index: number }) {
  return (
    <Box as="article" className="provider-rail">
      <Flex alignItems="center" gap="$4" className="provider-rail-heading">
        <span className="provider-rail-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="provider-rail-icon">{capabilityIcon(capability.id)}</span>
        <Heading size="h3">{capability.label}</Heading>
      </Flex>
      <Text size="sm" color="$mutedForeground" className="provider-rail-copy">{capability.role}</Text>
      <div className="provider-rail-options" aria-label={`${capability.label} providers`}>
        <span>{capability.defaultProvider}</span>
        <span aria-hidden="true">or</span>
        <span>{capability.alternativeProvider}</span>
      </div>
    </Box>
  );
}
