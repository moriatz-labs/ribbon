import { MarketingPage } from "@paul/ui-patterns/marketing";
import { ClosingSection } from "../components/ClosingSection";
import { HeroSection } from "../components/HeroSection";
import { LandingFooter } from "../components/LandingFooter";
import { LandingHeader } from "../components/LandingHeader";
import { ManifestSection } from "../components/ManifestSection";
import { ProvidersSection } from "../components/ProvidersSection";
import { WorkflowSection } from "../components/WorkflowSection";

export function PublicLandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <LandingHeader />
      <MarketingPage>
        <div id="main-content" tabIndex={-1}>
          <HeroSection />
          <ProvidersSection />
          <WorkflowSection />
          <ManifestSection />
          <ClosingSection />
        </div>
      </MarketingPage>
      <LandingFooter />
    </>
  );
}
