import { Container, Flex, Text } from "@paul/ui-core";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <Container>
        <Flex alignItems="center" justifyContent="space-between" gap="$5" wrap="wrap">
          <Text size="sm" color="$mutedForeground">VSCD · A Moriatz project by Paul M Kallarackal</Text>
          <nav aria-label="Footer navigation">
            <a href="https://paul.moriatz.com">Portfolio</a>
            <a href="https://github.com/Paul-M-Kallarackal/VSCD">GitHub</a>
            <a href="/console">Console</a>
          </nav>
        </Flex>
      </Container>
    </footer>
  );
}
