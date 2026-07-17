import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSystemProvider, TooltipProvider } from "@paul/ui-core";
import "@paul/ui-tokens/styles.css";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSystemProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </DesignSystemProvider>
  </StrictMode>,
);

