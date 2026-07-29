import { Box, Container, Flex, Grid, Heading, Stack, Text } from "strawn";
import { ArrowRightIcon, CheckIcon } from "strawn-icons";
import { ActionLink } from "./ActionLink";
import { MANIFEST_EXAMPLE } from "../constants";

const guarantees = [
  "Exact Strawn packages from npm",
  "Conflict-safe DNS writes",
  "Provider-specific authorization tests",
  "Reviewed, prebuilt production releases",
] as const;

export function ManifestSection() {
  return (
    <Box as="section" id="manifest" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$16" }}>
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(0, 1fr) minmax(22rem, .8fr)" }} gap="$10" css={{ alignItems: "center" }}>
        <Box className="code-panel">
          <Flex className="code-panel__header" alignItems="center" justifyContent="space-between" gap="$4">
            <Text css={{ fontFamily: "$ui", fontWeight: "$semibold" }}>Repository contract</Text>
            <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono" }}>ribbon.json</Text>
          </Flex>
          <pre><code>{MANIFEST_EXAMPLE}</code></pre>
          <Box className="code-panel__command">
            <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono" }}>pnpm ribbon check ../my-app</Text>
          </Box>
        </Box>
        <Stack gap="$6">
          <Stack gap="$3" css={{ maxWidth: "$reading" }}>
            <Text css={{ color: "$primary", fontFamily: "$ui", fontWeight: "$semibold" }}>Machine-readable contract</Text>
            <Heading size="h2">The repository states the rules before an agent changes code.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              ribbon.json selects providers. AGENTS.md defines the boundaries. Automated checks prove the result before release.
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
            <ActionLink href="#workflow" variant="outline" icon={<ArrowRightIcon aria-hidden="true" size={18} />}>Review the workflow</ActionLink>
          </Flex>
        </Stack>
        </Grid>
      </Container>
    </Box>
  );
}
