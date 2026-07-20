import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="sign-in-page">
      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <div className="sign-in-mark" aria-hidden="true"><LockKeyhole size={20} /></div>
        <p className="eyebrow">Project registry</p>
        <h1 id="sign-in-title">Sign in to manage your projects.</h1>
        <p className="sign-in-copy">Use your email to access provider selections, deployment status, and project URLs scoped to your account.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          const { error } = await supabase!.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin }
          });
          setMessage(error?.message ?? "Check your email for the secure sign-in link.");
          setSubmitting(false);
        }}>
          <label htmlFor="sign-in-email">Email address</label>
          <div className="email-control">
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={submitting} aria-label="Send sign-in link">
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </form>
        {message ? <p className="sign-in-message" role="status">{message}</p> : null}
      </section>
      <p className="sign-in-foot">DNS <span /> Backend <span /> Deployment <span /> Mail</p>
    </main>
  );
}
