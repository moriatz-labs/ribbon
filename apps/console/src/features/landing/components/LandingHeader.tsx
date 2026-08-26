import { Box, Container, Flex } from "strawn";
import { GitHubIcon } from "strawn-icons";
import { ActionLink } from "./ActionLink";

export function LandingHeader() {
  return (
    <Box as="header" className="site-header">
      <Container>
        <Flex as="nav" alignItems="center" justifyContent="space-between" gap="$4" aria-label="Primary navigation">
          <ActionLink href="/" variant="ghost">Ribbon</ActionLink>
          <Flex gap="$1">
            <ActionLink href="#start" variant="ghost">Start</ActionLink>
            <ActionLink
              href="https://github.com/moriatz-labs/ribbon"
              external
              icon={<GitHubIcon aria-hidden="true" size={17} />}
              variant="ghost"
            >
              Source
            </ActionLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
