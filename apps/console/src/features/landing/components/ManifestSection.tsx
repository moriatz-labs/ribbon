import { CodeDemo, FeatureSplit, MarketingSection } from "@paul/ui-patterns/marketing";
import { MANIFEST_EXAMPLE } from "../constants";

const guarantees = [
  "Repository-relative design-system source",
  "Conflict-safe DNS writes",
  "Provider-specific authorization tests",
  "Reviewed, prebuilt production releases",
] as const;

export function ManifestSection() {
  return (
    <MarketingSection id="manifest">
      <FeatureSplit
        eyebrow="Machine-readable contract"
        title="The repository explains itself before an agent changes it."
        description="vscd.json, README.md, and AGENTS.md agree on what is selectable, what is mandatory, and what must be verified."
        points={[...guarantees]}
        media={
          <CodeDemo
            title="vscd.json · manifest v2"
            snippets={[
              { id: "manifest", label: "Manifest", language: "JSON", code: MANIFEST_EXAMPLE },
              {
                id: "commands",
                label: "Commands",
                language: "Shell",
                code: "pnpm vscd providers\npnpm vscd init my-app\npnpm vscd check ../my-app",
              },
            ]}
          />
        }
      />
    </MarketingSection>
  );
}
