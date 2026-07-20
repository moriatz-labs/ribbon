import { Box, Container, Flex, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { ArrowRightIcon, CheckIcon } from "@paul/ui-icons";
import { CodeDemo, MarketingActionLink } from "@paul/ui-patterns/marketing";
import { MANIFEST_EXAMPLE } from "../constants";

const guarantees = [
  "Repository-relative design-system source",
  "Conflict-safe DNS writes",
  "Provider-specific authorization tests",
  "Reviewed, prebuilt production releases",
] as const;

export function ManifestSection() {
  return (
    <Box as="section" id="manifest" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$16" }}>
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(0, 1fr) minmax(22rem, .8fr)" }} gap="$10" css={{ alignItems: "center" }}>
        <CodeDemo
          title="Repository contract"
          snippets={[
            { id: "manifest", label: "vscd.json", language: "JSON", code: MANIFEST_EXAMPLE },
            { id: "verify", label: "Verify", language: "Shell", code: "pnpm vscd check ../my-app" },
          ]}
        />
        <Stack gap="$6">
          <Stack gap="$3" css={{ maxWidth: "$reading" }}>
            <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Machine-readable contract</Text>
            <Heading size="h2">The repository states the rules before an agent changes code.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              vscd.json selects providers. AGENTS.md defines the boundaries. Automated checks prove the result before release.
            </Text>
          </Stack>
          <Stack as="ul" gap="$3" css={{ margin: 0, padding: 0, listStyle: "none" }}>
            {guarantees.map((guarantee) => (
              <Flex as="li" alignItems="center" gap="$3" key={guarantee}>
                <CheckIcon aria-hidden="true" size={17} color="var(--success)" />
                <Text size="sm">{guarantee}</Text>
              </Flex>
            ))}
          </Stack>
          <Flex>
            <MarketingActionLink action={{ label: "Read the repository guide", href: "https://github.com/Paul-M-Kallarackal/VSCD/blob/main/README.md", external: true, variant: "outline", icon: <ArrowRightIcon aria-hidden="true" size={18} /> }} />
          </Flex>
        </Stack>
        </Grid>
      </Container>
    </Box>
  );
}
