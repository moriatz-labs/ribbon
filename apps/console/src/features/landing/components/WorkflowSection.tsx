import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { WORKFLOW_STEPS } from "../constants";

export function WorkflowSection() {
  return (
    <Box as="section" id="workflow" className="landing-section" aria-labelledby="workflow-title">
      <Container>
        <Stack gap="$4" className="landing-section-heading">
          <Text size="xs" color="$mutedForeground" className="landing-kicker">Agent workflow</Text>
          <Heading id="workflow-title" size="h2">A short path from intent to a reviewed release.</Heading>
        </Stack>
        <Grid columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="$5" className="workflow-grid">
          {WORKFLOW_STEPS.map((step) => (
            <Box as="article" className="workflow-card" key={step.number}>
              <Text size="xs" color="$mutedForeground" className="workflow-number">{step.number}</Text>
              <Heading size="h3">{step.title}</Heading>
              <Text size="sm" color="$mutedForeground">{step.description}</Text>
              <code>{step.command}</code>
            </Box>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
