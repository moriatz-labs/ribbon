import { Box, Container, Flex, Surface } from "@paul/ui-core";
import { MarketingActionLink } from "@paul/ui-patterns/marketing";

export function LandingHeader() {
  return (
    <Box as="header" css={{ position: "sticky", top: 0, zIndex: 50, paddingBlock: "$3", pointerEvents: "none" }}>
      <Container>
        <Surface tone="raised" radius="xl" padding="sm" css={{ boxShadow: "$nav", pointerEvents: "auto" }}>
          <Flex alignItems="center" justifyContent="space-between" gap="$3">
            <MarketingActionLink action={{ label: "VSCD", href: "/", variant: "ghost" }} />
            <Flex as="nav" aria-label="Primary navigation" gap="$1" css={{ display: "none", "@md": { display: "flex" } }}>
              <MarketingActionLink action={{ label: "Providers", href: "#providers", variant: "ghost" }} />
              <MarketingActionLink action={{ label: "Workflow", href: "#workflow", variant: "ghost" }} />
              <MarketingActionLink action={{ label: "Manifest", href: "#manifest", variant: "ghost" }} />
            </Flex>
            <MarketingActionLink action={{ label: "Open console", href: "/console" }} />
          </Flex>
        </Surface>
      </Container>
    </Box>
  );
}
