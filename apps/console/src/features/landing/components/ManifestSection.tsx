import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { CheckIcon } from "@paul/ui-icons";
import { MANIFEST_EXAMPLE } from "../constants";

const guarantees = [
  "Repository-relative design-system source",
  "Conflict-safe DNS writes",
  "Provider-specific authorization tests",
  "Reviewed, prebuilt production releases",
] as const;

export function ManifestSection() {
  return (
    <Box as="section" id="manifest" className="landing-section landing-manifest" aria-labelledby="manifest-title">
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(0, 1fr) minmax(22rem, .8fr)" }} gap="$10">
          <div className="manifest-code" aria-label="Example VSCD version 2 manifest">
            <div className="manifest-code-bar">
              <span>vscd.json</span>
              <span>manifest v2</span>
            </div>
            <pre><code>{MANIFEST_EXAMPLE}</code></pre>
          </div>
          <Stack gap="$5" className="manifest-copy">
            <Text size="xs" color="$mutedForeground" className="landing-kicker">Machine-readable contract</Text>
            <Heading id="manifest-title" size="h2">The repository explains itself before an agent changes it.</Heading>
            <Text color="$mutedForeground">
              `vscd.json`, `README.md`, and `AGENTS.md` describe the same boundaries: what is selectable, what is mandatory, and what must be verified before release.
            </Text>
            <ul className="manifest-guarantees">
              {guarantees.map((guarantee) => (
                <li key={guarantee}>
                  <CheckIcon aria-hidden="true" size={17} />
                  <span>{guarantee}</span>
                </li>
              ))}
            </ul>
            <a className="landing-text-link" href="https://github.com/Paul-M-Kallarackal/VSCD/blob/main/README.md" target="_blank" rel="noreferrer">
              Read the repository guide
            </a>
          </Stack>
        </Grid>
      </Container>
    </Box>
  );
}
