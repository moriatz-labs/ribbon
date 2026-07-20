import { Box, Container, Flex, Text } from "@paul/ui-core";
import { ExternalLinkList } from "@paul/ui-patterns/external-links";

export function LandingFooter() {
  return (
    <Box as="footer" css={{ borderTop: "$subtle solid $border", paddingBlock: "$8" }}>
      <Container>
        <Flex alignItems="center" justifyContent="space-between" gap="$4" wrap="wrap">
          <Text size="sm" css={{ color: "$mutedForeground" }}>VSCD · A Moriatz project by Paul M Kallarackal</Text>
          <ExternalLinkList
            items={[
              { label: "Portfolio", href: "https://paul.moriatz.com" },
              { label: "GitHub", href: "https://github.com/Paul-M-Kallarackal/VSCD" },
            ]}
          />
        </Flex>
      </Container>
    </Box>
  );
}
