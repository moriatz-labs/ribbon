import { Box } from "strawn";
import { HeroSection } from "../components/HeroSection";
import { LandingFooter } from "../components/LandingFooter";
import { LandingHeader } from "../components/LandingHeader";
import { ManifestSection } from "../components/ManifestSection";
import { ProvidersSection } from "../components/ProvidersSection";
import { WorkflowSection } from "../components/WorkflowSection";

export function PublicLandingPage() {
  return (
    <Box css={{ minHeight: "100vh", overflow: "hidden", background: "$background", color: "$foreground" }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <LandingHeader />
      <main id="main-content">
        <HeroSection />
        <ProvidersSection />
        <WorkflowSection />
        <ManifestSection />
      </main>
      <LandingFooter />
    </Box>
  );
}
