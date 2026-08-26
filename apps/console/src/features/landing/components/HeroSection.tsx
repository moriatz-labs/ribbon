import { Box, Container, Flex, Grid, Heading, Stack, Text } from "strawn";
import { ArrowRightIcon, GitHubIcon } from "strawn-icons";
import { CAPABILITY_LABELS } from "../constants";
import { ActionLink } from "./ActionLink";

export function HeroSection() {
  return (
    <Box as="section" className="hero-section">
      <Container>
        <Grid
          className="hero-grid"
          columns={{
            initial: "minmax(0, 1fr)",
            lg: "minmax(0, .78fr) minmax(28rem, 1.22fr)",
          }}
          gap="$12"
        >
          <Stack className="hero-copy" gap="$6">
            <Stack gap="$4">
              <Text className="eyebrow" size="xs">
                Control plane for small products
              </Text>
              <Heading className="hero-title" size="h1">
                One manifest. A clean path to production.
              </Heading>
              <Text className="hero-description" size="lg">
                Choose each provider once. Ribbon scaffolds the right files,
                preserves the boundaries, and checks the result before release.
              </Text>
            </Stack>
            <Flex gap="$3" wrap="wrap">
              <ActionLink
                href="#start"
                icon={<ArrowRightIcon aria-hidden="true" size={18} />}
              >
                See the three commands
              </ActionLink>
              <ActionLink
                href="https://github.com/moriatz-labs/ribbon"
                external
                icon={<GitHubIcon aria-hidden="true" size={18} />}
                variant="outline"
              >
                View source
              </ActionLink>
            </Flex>
          </Stack>

          <Box as="figure" className="ribbon-visual">
            <img
              src="/images/ribbon-switchboard.webp"
              alt="One flowing ribbon connects email, DNS, frontend, and database capabilities."
              width="1536"
              height="1024"
              fetchPriority="high"
            />
            <Box as="figcaption" className="capability-caption">
              <Text size="xs">Five independent choices</Text>
              <Box
                as="ul"
                className="capability-list"
                aria-label="Ribbon manifest capabilities"
              >
                {CAPABILITY_LABELS.map((label) => (
                  <Box as="li" key={label}>{label}</Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Grid>
      </Container>
    </Box>
  );
}
