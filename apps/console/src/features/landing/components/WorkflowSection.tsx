import { Badge, Card, CardContent, CardHeader, Grid, Heading, Stack, Surface, Text } from "@paul/ui-core";
import { MarketingSection } from "@paul/ui-patterns/marketing";
import { WORKFLOW_STEPS } from "../constants";

export function WorkflowSection() {
  return (
    <MarketingSection id="workflow" css={{ paddingBlock: "$16", "@lg": { paddingBlock: "$16" } }}>
      <Stack gap="$10">
        <Stack gap="$3" css={{ maxWidth: "$reading" }}>
          <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Agent workflow</Text>
          <Heading size="h2">From intent to a reviewed release in three steps.</Heading>
          <Text size="lg" css={{ color: "$mutedForeground" }}>
            The manifest selects the stack. VSCD generates only what that stack needs, then proves the result before production.
          </Text>
        </Stack>
        <Grid columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="$5">
          {WORKFLOW_STEPS.map((step) => (
            <Card css={{ height: "100%" }} key={step.number}>
              <CardHeader>
                <Badge>{step.number}</Badge>
                <Heading size="h3">{step.title}</Heading>
                <Text>{step.description}</Text>
              </CardHeader>
              <CardContent css={{ marginTop: "auto" }}>
                <Surface tone="inset" radius="sm" padding="sm">
                  <Text size="xs" css={{ fontFamily: "$mono", overflowWrap: "anywhere" }}>{step.command}</Text>
                </Surface>
              </CardContent>
            </Card>
          ))}
        </Grid>
      </Stack>
    </MarketingSection>
  );
}
