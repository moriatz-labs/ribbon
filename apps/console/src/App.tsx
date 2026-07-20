import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PublicLandingPage } from "./features/landing/pages/PublicLandingPage";

const ConsoleRoute = lazy(() => import("./features/console/pages/ConsoleRoute").then((module) => ({ default: module.ConsoleRoute })));

export function App() {
  const { hash, pathname } = useLocation();
  const isConsoleRoute = pathname.startsWith("/console");

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  if (!isConsoleRoute) return <PublicLandingPage />;

  return (
    <Suspense fallback={<main className="session-loading">Loading the console...</main>}>
      <ConsoleRoute />
    </Suspense>
  );
}
