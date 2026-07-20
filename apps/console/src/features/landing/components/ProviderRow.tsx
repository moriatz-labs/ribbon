import { Badge, Flex, Grid, Heading, Stack, Text } from "@paul/ui-core";
import type { ProviderCapability } from "../types";

export function ProviderRow({ capability, index }: { capability: ProviderCapability; index: number }) {
  return (
    <Grid
      as="li"
      columns="2.25rem minmax(0, 1fr)"
      gap="$5"
      css={{
        alignItems: "start",
        borderTop: "$subtle solid $border",
        paddingBlock: "$6",
        "@lg": { gridTemplateColumns: "3rem minmax(0, 1fr) 18rem", paddingBlock: "$8" },
      }}
    >
      <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono", paddingTop: "$1" }}>
        {String(index + 1).padStart(2, "0")}
      </Text>
      <Stack gap="$2">
        <Heading size="h3">{capability.label}</Heading>
        <Text css={{ maxWidth: "$reading", color: "$mutedForeground" }}>{capability.role}</Text>
      </Stack>
      <Stack gap="$3" css={{ gridColumn: "2 / -1", "@lg": { gridColumn: "auto" } }}>
        <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$nav", fontWeight: "$semibold" }}>
          Supported providers
        </Text>
        <Flex gap="$2" wrap="wrap" aria-label={`${capability.label} providers`}>
          <Badge tone="info">{capability.defaultProvider}</Badge>
          <Badge>{capability.alternativeProvider}</Badge>
        </Flex>
      </Stack>
    </Grid>
  );
}
