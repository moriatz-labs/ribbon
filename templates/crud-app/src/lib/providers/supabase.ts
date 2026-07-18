import { createClient, type Session } from "@supabase/supabase-js";
import type { BackendAdapter, BackendSession, RecordItem } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.");
}

const client = createClient(url, publishableKey);

function sessionValue(session: Session | null): BackendSession | null {
  return session
    ? { user: { id: session.user.id, email: session.user.email } }
    : null;
}

export const backend: BackendAdapter = {
  id: "supabase",
  subscribeSession(listener) {
    void client.auth.getSession().then(({ data }) => listener(sessionValue(data.session)));
    const { data } = client.auth.onAuthStateChange((_event, session) => listener(sessionValue(session)));
    return () => data.subscription.unsubscribe();
  },
  async sendMagicLink(email) {
    if ("__AUTH_DELIVERY__" === "hostinger-mail") {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The sign-in link could not be sent.");
      return;
    }
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
  async listItems() {
    const { data, error } = await client.from("items").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as RecordItem[];
  },
  async createItem(item) {
    const { error } = await client.from("items").insert(item);
    if (error) throw error;
  },
  async deleteItem(id) {
    const { error } = await client.from("items").delete().eq("id", id);
    if (error) throw error;
  },
  async uploadAttachment(session, itemId, file) {
    const path = `${session.user.id}/${itemId}/${file.name}`;
    const upload = await client.storage.from("attachments").upload(path, file, { upsert: true });
    if (upload.error) throw upload.error;
    const update = await client.from("items").update({ attachment_path: path }).eq("id", itemId);
    if (update.error) throw update.error;
  }
};

