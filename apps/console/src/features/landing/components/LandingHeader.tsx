import { FluidGlassNavbar } from "@paul/ui-patterns/navigation";

export function LandingHeader() {
  return (
    <FluidGlassNavbar
      brand={{ label: "VSCD", to: "/" }}
      items={[
        { label: "Providers", to: "/#providers" },
        { label: "Workflow", to: "/#workflow" },
        { label: "Manifest", to: "/#manifest" },
      ]}
      action={{ label: "Open console", to: "/console" }}
      tone="white"
      appearance="light"
      size="medium"
      width="content"
    />
  );
}
