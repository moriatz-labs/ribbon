import { Box, Container, Grid, Heading, Stack, Text } from "strawn";
import { WORKFLOW_STEPS } from "../constants";

export function WorkflowSection() {
  return (
    <Box as="section" id="start" className="workflow-section">
      <Container>
        <Grid
          columns={{ initial: "minmax(0, 1fr)", lg: "minmax(0, .72fr) minmax(28rem, 1.28fr)" }}
          gap="$12"
        >
          <Stack className="workflow-copy" gap="$4">
            <Text className="eyebrow" size="xs">Use Ribbon</Text>
            <Heading size="h2">Three commands. One clear path.</Heading>
            <Text size="lg">
              See the choices, create only the selected stack, then prove the result.
            </Text>
          </Stack>

          <Box as="ol" className="command-list">
            {WORKFLOW_STEPS.map((step) => (
              <Box as="li" className="command-row" key={step.number}>
                <Text className="command-number" size="xs">{step.number}</Text>
                <Stack gap="$1">
                  <Text className="command-title" size="sm">{step.title}</Text>
                  <Box as="code" className="command-code">{step.command}</Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Grid>
      </Container>
    </Box>
  );
}
