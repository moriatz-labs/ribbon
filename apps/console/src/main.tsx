import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSystemProvider } from "@paul/ui-core";
import "@paul/ui-tokens/styles.css";
import "@paul/ui-themes/portfolio.css";
import { App } from "./App";
import "./styles.css";

document.documentElement.dataset.theme = "portfolio";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
  </StrictMode>
);

