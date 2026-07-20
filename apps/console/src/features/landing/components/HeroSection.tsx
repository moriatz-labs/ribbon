import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { ArrowRightIcon, GitHubIcon } from "@paul/ui-icons";

export function HeroSection() {
  return (
    <Box as="section" className="landing-hero" aria-labelledby="landing-title">
      <Container>
        <Grid className="landing-hero-grid" columns={{ initial: "1fr", lg: "minmax(0, .88fr) minmax(30rem, 1.12fr)" }} gap="$10">
          <Stack className="landing-hero-copy" gap="$6">
            <Text size="xs" color="$mutedForeground" className="landing-kicker">
              Provider-composable delivery
            </Text>
            <Heading id="landing-title" size="h1" className="landing-title">
              Ship the product. Keep the stack replaceable.
            </Heading>
            <Text size="lg" color="$mutedForeground" className="landing-lede">
              VSCD turns DNS, backend, deployment, mail, and Paul&apos;s design system into a small manifest that agents can scaffold, verify, and release.
            </Text>
            <div className="landing-actions">
              <a className="landing-button landing-button-primary" href="#manifest">
                Read the manifest
                <ArrowRightIcon aria-hidden="true" size={18} />
              </a>
              <a className="landing-button landing-button-secondary" href="https://github.com/Paul-M-Kallarackal/VSCD" target="_blank" rel="noreferrer">
                <GitHubIcon aria-hidden="true" size={18} />
                View source
              </a>
            </div>
            <div className="landing-command" aria-label="Quick start command">
              <span aria-hidden="true">$</span>
              <code>pnpm vscd init my-app</code>
            </div>
          </Stack>
          <figure className="landing-visual">
            <img
              src="/images/vscd-switchboard.webp"
              alt="A tactile modular switchboard routing four capability lanes into replaceable provider blocks."
              width="1536"
              height="1024"
              fetchPriority="high"
            />
            <figcaption>
              One control plane. Four independent capability slots.
            </figcaption>
          </figure>
        </Grid>
      </Container>
    </Box>
  );
}
