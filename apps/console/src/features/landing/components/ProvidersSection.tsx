import { Box, Container, Grid, Heading, Stack, Surface, Text, VisuallyHidden } from "strawn";
import { PROVIDER_CAPABILITIES } from "../constants";

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$10" }}>
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(0, .72fr) minmax(0, 1.28fr)" }} gap="$8" css={{ alignItems: "start" }}>
          <Stack gap="$3">
            <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Provider matrix</Text>
            <Heading size="h2">Four contracts. One manifest.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              Choose DNS, backend, deployment, and mail independently. Every provider stays replaceable.
            </Text>
          </Stack>
          <Surface className="provider-table-shell" tone="raised" radius="lg">
            <table className="provider-table">
              <VisuallyHidden as="caption">VSCD capabilities and supported providers</VisuallyHidden>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Supported providers</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDER_CAPABILITIES.map((capability) => (
                  <tr key={capability.id}>
                    <td>
                      <Stack gap="$1">
                        <Text css={{ fontFamily: "$nav", fontWeight: "$semibold" }}>{capability.label}</Text>
                        <Text size="sm" css={{ color: "$mutedForeground" }}>{capability.role}</Text>
                      </Stack>
                    </td>
                    <td>
                      <Stack gap="$1">
                        <Text size="xs" css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>{capability.defaultProvider}</Text>
                        <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$nav" }}>{capability.alternativeProvider}</Text>
                      </Stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        </Grid>
      </Container>
    </Box>
  );
}
