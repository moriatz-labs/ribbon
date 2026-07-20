import { lazy, Suspense } from "react";
import { PublicLandingPage } from "./features/landing/pages/PublicLandingPage";

const ConsoleRoute = lazy(() => import("./features/console/pages/ConsoleRoute").then((module) => ({ default: module.ConsoleRoute })));

export function App() {
  const isConsoleRoute = window.location.pathname.startsWith("/console");

  if (!isConsoleRoute) return <PublicLandingPage />;

  return (
    <Suspense fallback={<main className="session-loading">Loading the console...</main>}>
      <ConsoleRoute />
    </Suspense>
  );
}
