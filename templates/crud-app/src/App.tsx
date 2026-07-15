import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "./lib/supabase";

interface RecordItem {
  id: string;
  title: string;
  body: string;
  attachment_path: string | null;
  updated_at: string;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadItems() {
    const { data, error } = await supabase.from("items").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    setItems(data ?? []);
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void loadItems().catch((error: Error) => setMessage(error.message));
  }, [session]);

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">__APP_TITLE__</p>
          <h1>Sign in to your workspace.</h1>
          <p>A secure link will be sent to your email.</p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
            setMessage(error?.message ?? "Check your email for the sign-in link.");
          }}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <button type="submit">Send sign-in link</button>
          </form>
          {message ? <p role="status">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header>
        <div><p className="eyebrow">Workspace</p><h1>__APP_TITLE__</h1></div>
        <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void supabase.auth.signOut()}>
          <LogOut aria-hidden="true" size={18} />
        </button>
      </header>

      <section className="composer" aria-labelledby="new-record-heading">
        <div><p className="eyebrow">New record</p><h2 id="new-record-heading">Capture something useful.</h2></div>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const { error } = await supabase.from("items").insert({ title, body });
          if (error) return setMessage(error.message);
          setTitle(""); setBody(""); setMessage(null); await loadItems();
        }}>
          <label htmlFor="title">Title</label>
          <input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
          <label htmlFor="body">Details</label>
          <textarea id="body" rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
          <button type="submit"><Plus aria-hidden="true" size={17} />Add record</button>
        </form>
      </section>

      {message ? <p className="message" role="status">{message}</p> : null}

      <section className="record-grid" aria-label="Records">
        {items.map((item) => (
          <article className="record-card" key={item.id}>
            <div><h2>{item.title}</h2><p>{item.body || "No details yet."}</p></div>
            <footer>
              <label className="icon-button" title="Upload attachment">
                <Upload aria-hidden="true" size={17} />
                <span className="sr-only">Upload attachment</span>
                <input className="sr-only" type="file" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const path = `${session.user.id}/${item.id}/${file.name}`;
                  const upload = await supabase.storage.from("attachments").upload(path, file, { upsert: true });
                  if (upload.error) return setMessage(upload.error.message);
                  const update = await supabase.from("items").update({ attachment_path: path }).eq("id", item.id);
                  if (update.error) return setMessage(update.error.message);
                  await loadItems();
                }} />
              </label>
              <button className="icon-button" aria-label={`Delete ${item.title}`} title="Delete" onClick={async () => {
                const { error } = await supabase.from("items").delete().eq("id", item.id);
                if (error) return setMessage(error.message);
                await loadItems();
              }}><Trash2 aria-hidden="true" size={17} /></button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

