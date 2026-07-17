import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const configuredDesignSystem = process.env.DESIGN_SYSTEM_SOURCE;
const localDesignSystem = configuredDesignSystem
  ? path.resolve(configuredDesignSystem)
  : path.resolve(__dirname, "../design-system");
const remoteDesignSystem = path.resolve(__dirname, ".vercel-design-system");
const designSystemRoot = existsSync(path.join(localDesignSystem, "packages/ui_core/src/index.ts"))
  ? localDesignSystem
  : remoteDesignSystem;

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^@paul\/ui-core$/, replacement: path.join(designSystemRoot, "packages/ui_core/src/index.ts") },
      { find: /^@paul\/ui-icons$/, replacement: path.join(designSystemRoot, "packages/ui_icons/src/index.ts") },
      { find: /^@paul\/ui-patterns$/, replacement: path.join(designSystemRoot, "packages/ui_patterns/src/index.tsx") },
      { find: "@paul/ui-tokens/styles.css", replacement: path.join(designSystemRoot, "packages/ui_tokens/src/styles.css") },
    ],
  },
});

