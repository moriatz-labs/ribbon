import { Badge, Card, CardContent, CardHeader, Flex, Heading, Surface, Text } from "@paul/ui-core";
import { CloudIcon, DatabaseIcon, GlobeIcon, MailIcon } from "@paul/ui-icons";
import type { ProviderCapability } from "../types";

function capabilityIcon(id: ProviderCapability["id"]) {
  if (id === "dns") return <GlobeIcon aria-hidden="true" size={20} />;
  if (id === "backend") return <DatabaseIcon aria-hidden="true" size={20} />;
  if (id === "deployment") return <CloudIcon aria-hidden="true" size={20} />;
  return <MailIcon aria-hidden="true" size={20} />;
}

export function ProviderCard({ capability }: { capability: ProviderCapability }) {
  return (
    <Card css={{ height: "100%" }}>
      <CardHeader>
        <Flex alignItems="center" gap="$3">
          <Surface tone="inset" radius="md" padding="sm">
            {capabilityIcon(capability.id)}
          </Surface>
          <Heading size="h3">{capability.label}</Heading>
        </Flex>
        <Text>{capability.role}</Text>
      </CardHeader>
      <CardContent css={{ marginTop: "auto" }}>
        <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$nav", fontWeight: "$semibold" }}>
          Supported providers
        </Text>
        <Flex gap="$2" wrap="wrap" aria-label={`${capability.label} providers`}>
          <Badge tone="info">{capability.defaultProvider}</Badge>
          <Badge>{capability.alternativeProvider}</Badge>
        </Flex>
      </CardContent>
    </Card>
  );
}
