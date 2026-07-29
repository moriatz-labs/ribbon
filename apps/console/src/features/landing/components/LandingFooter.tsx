import { Box, Container, Flex, Text } from "strawn";
import { ActionLink } from "./ActionLink";

export function LandingFooter() {
  return (
    <Box as="footer" css={{ borderTop: "$subtle solid $border", paddingBlock: "$8" }}>
      <Container>
        <Flex alignItems="center" justifyContent="space-between" gap="$4" wrap="wrap">
          <Text size="sm" css={{ color: "$mutedForeground" }}>Ribbon · A Moriatz project by Paul M Kallarackal</Text>
          <Flex gap="$1" wrap="wrap">
            <ActionLink href="https://paul.moriatz.com" external variant="ghost">Portfolio</ActionLink>
            <ActionLink href="#manifest" variant="ghost">Manifest</ActionLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
