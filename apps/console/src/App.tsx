import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { TooltipProvider } from "./components/ui/Tooltip";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { DashboardPage } from "./pages/DashboardPage";
import { SignInPage } from "./pages/SignInPage";

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return <main className="session-loading">Checking your session...</main>;
  }

  if (hasSupabaseConfig && !session) {
    return <SignInPage />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <DashboardPage
        userEmail={session?.user.email}
        onSignOut={supabase ? signOut : undefined}
      />
    </TooltipProvider>
  );
}
