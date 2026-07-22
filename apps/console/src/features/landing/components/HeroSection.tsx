import { Box, Card, CardContent, CardMedia, Container, Flex, Grid, Heading, Stack, Text } from "strawn";
import { ArrowRightIcon, GitHubIcon } from "strawn-icons";
import { MarketingActionLink } from "./MarketingActionLink";

export function HeroSection() {
  return (
    <Box as="section" css={{ paddingBlock: "$10 $16" }}>
      <Container>
        <Card>
          <CardMedia css={{ padding: "$3", "& img": { display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "$lg", "@md": { aspectRatio: "16 / 8" } } }}>
          <img
            src="/images/vscd-switchboard.webp"
            alt="A tactile modular switchboard routing four capability lanes into replaceable provider blocks."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          </CardMedia>
          <CardContent css={{ paddingTop: "$5" }}>
            <Grid columns={{ initial: "1fr", lg: "minmax(0, 1fr) auto" }} gap="$8" css={{ alignItems: "end" }}>
              <Stack gap="$4">
                <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono", letterSpacing: "$caps" }}>
                  DNS · BACKEND · DEPLOYMENT · MAIL
                </Text>
                <Heading size="h1" css={{ maxWidth: "20ch", fontSize: "$3xl", lineHeight: "$tight" }}>
                  Ship fast. Keep the stack replaceable.
                </Heading>
                <Text size="lg" css={{ maxWidth: "$reading", color: "$mutedForeground" }}>
                  One manifest tells agents which providers to scaffold, which boundaries to preserve, and which checks must pass before release.
                </Text>
              </Stack>
              <Flex gap="$3" wrap="wrap">
                <MarketingActionLink action={{ label: "Read the manifest", href: "#manifest", icon: <ArrowRightIcon aria-hidden="true" size={18} /> }} />
                <MarketingActionLink action={{ label: "View source", href: "https://github.com/Paul-M-Kallarackal/VSCD", external: true, variant: "outline", icon: <GitHubIcon aria-hidden="true" size={18} /> }} />
              </Flex>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
