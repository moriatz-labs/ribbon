import { Container, Flex } from "@paul/ui-core";
import { GitHubIcon } from "@paul/ui-icons";

export function LandingHeader() {
  return (
    <header className="landing-header">
      <Container>
        <Flex alignItems="center" justifyContent="space-between" gap="$5">
          <a className="landing-brand" href="/" aria-label="VSCD home">
            <span aria-hidden="true" className="landing-brand-mark">V</span>
            <span>VSCD</span>
          </a>
          <nav className="landing-nav" aria-label="Primary navigation">
            <a href="#providers">Providers</a>
            <a href="#workflow">Workflow</a>
            <a href="#manifest">Manifest</a>
            <a href="https://github.com/Paul-M-Kallarackal/VSCD" target="_blank" rel="noreferrer">
              <GitHubIcon aria-hidden="true" size={16} />
              Source
            </a>
            <a className="landing-nav-console" href="/console">Open console</a>
          </nav>
        </Flex>
      </Container>
    </header>
  );
}
