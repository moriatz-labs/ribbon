import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { PROVIDER_CAPABILITIES } from "../constants";
import { ProviderRail } from "./ProviderRail";

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" className="landing-section landing-providers" aria-labelledby="providers-title">
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(15rem, .58fr) minmax(0, 1.42fr)" }} gap="$10">
          <Stack gap="$4" className="landing-section-copy">
            <Text size="xs" className="landing-kicker landing-kicker-inverse">Capability slots</Text>
            <Heading id="providers-title" size="h2">Replace one provider without redrawing the product.</Heading>
            <Text color="$mutedForeground">
              Each slot owns one operational contract. The browser stays provider-neutral; infrastructure choices stay explicit.
            </Text>
          </Stack>
          <div className="provider-rail-list">
            {PROVIDER_CAPABILITIES.map((capability, index) => (
              <ProviderRail capability={capability} index={index} key={capability.id} />
            ))}
          </div>
        </Grid>
      </Container>
    </Box>
  );
}
