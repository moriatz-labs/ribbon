import { Box, Container, Flex, Text } from "@paul/ui-core";
import { MarketingActionLink } from "@paul/ui-patterns/marketing";

export function LandingFooter() {
  return (
    <Box as="footer" css={{ borderTop: "$subtle solid $border", paddingBlock: "$8" }}>
      <Container>
        <Flex alignItems="center" justifyContent="space-between" gap="$4" wrap="wrap">
          <Text size="sm" css={{ color: "$mutedForeground" }}>VSCD · A Moriatz project by Paul M Kallarackal</Text>
          <Flex gap="$1" wrap="wrap">
            <MarketingActionLink action={{ label: "Portfolio", href: "https://paul.moriatz.com", external: true, variant: "ghost" }} />
            <MarketingActionLink action={{ label: "GitHub", href: "https://github.com/Paul-M-Kallarackal/VSCD", external: true, variant: "ghost" }} />
            <MarketingActionLink action={{ label: "Project registry", href: "/console", variant: "ghost" }} />
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
