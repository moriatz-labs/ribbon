import { Box, Container, Heading, Stack, Text } from "@paul/ui-core";
import { PROVIDER_CAPABILITIES } from "../constants";
import { ProviderRow } from "./ProviderRow";

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$16" }}>
      <Container>
        <Stack gap="$8">
          <Stack gap="$3" css={{ maxWidth: "$reading" }}>
            <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Four independent capabilities</Text>
            <Heading size="h2">Choose infrastructure by capability.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              Each capability owns one contract. Provider choices stay explicit and replaceable.
            </Text>
          </Stack>
          <Box as="ol" css={{ margin: 0, padding: 0, listStyle: "none", borderBottom: "$subtle solid $border" }}>
            {PROVIDER_CAPABILITIES.map((capability, index) => (
              <ProviderRow capability={capability} index={index} key={capability.id} />
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
