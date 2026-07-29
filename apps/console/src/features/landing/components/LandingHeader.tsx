import { Box, Container, Flex } from "strawn";
import { ActionLink } from "./ActionLink";

export function LandingHeader() {
  return (
    <Box as="header" className="site-header">
      <Container>
        <Flex as="nav" alignItems="center" justifyContent="space-between" gap="$4" aria-label="Primary navigation">
          <ActionLink href="/" variant="ghost">Ribbon</ActionLink>
          <Flex gap="$1" wrap="wrap">
            <ActionLink href="#providers" variant="ghost">Providers</ActionLink>
            <ActionLink href="#workflow" variant="ghost">Workflow</ActionLink>
            <ActionLink href="#manifest" variant="ghost">Manifest</ActionLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
