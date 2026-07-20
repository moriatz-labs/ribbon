import { Heading, Stack, Text } from "@paul/ui-core/marketing";
import { FileTextIcon, PackageIcon, ShieldCheckIcon } from "@paul/ui-icons";
import { BentoGrid, MarketingSection } from "@paul/ui-patterns/marketing";
import { WORKFLOW_STEPS } from "../constants";

const workflowIcons = [
  <FileTextIcon aria-hidden="true" key="describe" />,
  <PackageIcon aria-hidden="true" key="generate" />,
  <ShieldCheckIcon aria-hidden="true" key="verify" />,
] as const;

export function WorkflowSection() {
  return (
    <MarketingSection id="workflow" muted>
      <Stack gap="$10">
        <Stack gap="$3" css={{ maxWidth: "$reading", marginInline: "auto", textAlign: "center" }}>
          <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Agent workflow</Text>
          <Heading size="h2" css={{ fontSize: "$2xl", lineHeight: "$tight", "@md": { fontSize: "$3xl" } }}>
            A short path from intent to a reviewed release.
          </Heading>
          <Text size="lg" css={{ color: "$mutedForeground" }}>
            The repository tells an agent what to select, what to generate, and what must pass before anything ships.
          </Text>
        </Stack>
        <BentoGrid
          label="Agent workflow"
          items={WORKFLOW_STEPS.map((step, index) => ({
            id: step.number,
            eyebrow: step.number,
            title: step.title,
            description: `${step.description} Run ${step.command}.`,
            icon: workflowIcons[index],
          }))}
        />
      </Stack>
    </MarketingSection>
  );
}
