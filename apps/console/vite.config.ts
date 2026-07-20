import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repositoryRoot = path.resolve(__dirname, "../..");
const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, "vscd.json"), "utf8")) as {
  providers?: { designSystem?: { source?: string } };
};
const configuredDesignSystem = process.env.DESIGN_SYSTEM_SOURCE ?? manifest.providers?.designSystem?.source;
const localDesignSystem = path.resolve(repositoryRoot, configuredDesignSystem ?? "../../../design-system");
const remoteDesignSystem = path.resolve(repositoryRoot, ".vercel-design-system");
const designSystemRoot = existsSync(path.join(localDesignSystem, "packages/ui_core/src/index.ts"))
  ? localDesignSystem
  : remoteDesignSystem;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^@paul\/ui-core\/marketing$/, replacement: path.join(designSystemRoot, "packages/ui_core/src/marketing.ts") },
      { find: /^@paul\/ui-core$/, replacement: path.join(designSystemRoot, "packages/ui_core/src/index.ts") },
      { find: /^@paul\/ui-icons$/, replacement: path.join(designSystemRoot, "packages/ui_icons/src/index.ts") },
      { find: /^@paul\/ui-patterns\/marketing$/, replacement: path.join(designSystemRoot, "packages/ui_patterns/src/marketing.ts") },
      { find: /^@paul\/ui-patterns$/, replacement: path.join(designSystemRoot, "packages/ui_patterns/src/index.tsx") },
      { find: "@paul/ui-themes/portfolio.css", replacement: path.join(designSystemRoot, "packages/ui_themes/src/portfolio.css") },
      { find: "@paul/ui-tokens/styles.css", replacement: path.join(designSystemRoot, "packages/ui_tokens/src/styles.css") },
    ],
  },
  server: {
    port: 4310
  }
});

