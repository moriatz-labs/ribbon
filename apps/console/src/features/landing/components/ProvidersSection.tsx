import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { PROVIDER_CAPABILITIES } from "../constants";
import { ProviderCard } from "./ProviderCard";

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$16" }}>
      <Container>
        <Stack gap="$10">
        <Stack gap="$3" css={{ maxWidth: "$reading" }}>
          <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Four independent capabilities</Text>
          <Heading size="h2">Choose infrastructure by capability.</Heading>
          <Text size="lg" css={{ color: "$mutedForeground" }}>
            Each capability has one contract and an explicit provider choice. Change one without rewriting the browser or release model.
          </Text>
        </Stack>
        <Grid columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap="$5">
          {PROVIDER_CAPABILITIES.map((capability) => (
            <ProviderCard capability={capability} key={capability.id} />
          ))}
        </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
