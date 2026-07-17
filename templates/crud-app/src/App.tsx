import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Alert,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  IconButton,
  Stack,
  Surface,
  Text,
  Textarea,
  TextField,
  TextStyle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@paul/ui-core";
import { LogOutIcon, PlusIcon, TrashIcon } from "@paul/ui-icons";
import { DatePicker } from "@paul/ui-patterns";
import { supabase } from "./lib/supabase";

interface RecordItem {
  id: string;
  title: string;
  body: string;
  due_date: string | null;
  attachment_path: string | null;
  updated_at: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
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

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The sign-in link could not be sent.");
      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sign-in link could not be sent.");
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.from("items").insert({ title, body, due_date: dueDate || null });
    if (error) return setMessage(error.message);
    setTitle("");
    setBody("");
    setDueDate("");
    setMessage(null);
    await loadItems();
  }

  if (!session) {
    return (
      <Box as="main" className="auth-page">
        <Container size="reading">
          <Surface className="auth-card" tone="raised" radius="xl" padding="lg">
            <Stack gap="$6">
              <Stack gap="$2">
                <TextStyle textStyle="eyebrow" tone="muted">__APP_TITLE__</TextStyle>
                <TextStyle as="h1" textStyle="headingLg">Sign in to your workspace</TextStyle>
                <Text color="$mutedForeground" css={{ margin: 0 }}>A secure magic link will be sent to your email.</Text>
              </Stack>
              <form onSubmit={sendMagicLink}>
                <Stack gap="$4">
                  <TextField
                    autoComplete="email"
                    inputMode="email"
                    label="Email address"
                    name="email"
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    required
                    spellCheck={false}
                    type="email"
                    value={email}
                  />
                  <Button type="submit">Send sign-in link</Button>
                </Stack>
              </form>
              {message ? <Alert>{message}</Alert> : null}
            </Stack>
          </Surface>
        </Container>
      </Box>
    );
  }

  return (
    <Box as="main" className="workspace">
      <Container>
        <Stack gap="$6">
          <Flex as="header" alignItems="center" justifyContent="space-between" gap="$4">
            <Stack gap="$1">
              <TextStyle textStyle="eyebrow" tone="muted">Workspace</TextStyle>
              <TextStyle as="h1" textStyle="headingLg">__APP_TITLE__</TextStyle>
            </Stack>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <IconButton
                    icon={<LogOutIcon width={18} height={18} />}
                    label="Sign out"
                    variant="outline"
                    onClick={() => void supabase.auth.signOut()}
                    type="button"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          </Flex>

          <Surface as="section" tone="raised" radius="lg" padding="lg" aria-labelledby="new-record-heading">
            <Grid className="composer" columns={{ initial: "1fr", md: "minmax(14rem, .7fr) minmax(0, 1.3fr)" }} gap="$6">
              <Stack gap="$2">
                <TextStyle textStyle="eyebrow" tone="muted">New record</TextStyle>
                <TextStyle as="h2" id="new-record-heading" textStyle="headingSm">Capture something useful</TextStyle>
                <Text size="sm" color="$mutedForeground" css={{ margin: 0 }}>
                  Use Paul’s components as the default building blocks for every generated product.
                </Text>
              </Stack>
              <form onSubmit={addItem}>
                <Stack gap="$4">
                  <TextField label="Title" required value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
                  <Textarea label="Details" rows={4} value={body} onChange={(event) => setBody(event.currentTarget.value)} />
                  <DatePicker label="Review date" value={dueDate} onValueChange={setDueDate} />
                  <Button leftIcon={<PlusIcon width={17} height={17} />} type="submit">Add record</Button>
                </Stack>
              </form>
            </Grid>
          </Surface>

          {message ? <Alert>{message}</Alert> : null}

          <Grid as="section" className="record-grid" aria-label="Records" columns={{ initial: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }} gap="$5">
            {items.length === 0 ? (
              <Surface tone="inset" radius="lg" padding="lg">
                <Stack gap="$1">
                  <TextStyle textStyle="title">No records yet</TextStyle>
                  <Text size="sm" color="$mutedForeground" css={{ margin: 0 }}>Add the first record above.</Text>
                </Stack>
              </Surface>
            ) : null}
            {items.map((item) => (
              <Surface as="article" className="record-card" key={item.id} tone="default" radius="lg" padding="lg">
                <Stack gap="$5" css={{ height: "100%" }}>
                  <Stack gap="$2">
                    <TextStyle as="h2" textStyle="title">{item.title}</TextStyle>
                    <Text size="sm" color="$mutedForeground" css={{ margin: 0 }}>{item.body || "No details yet."}</Text>
                    {item.due_date ? <TextStyle textStyle="caption" tone="muted">Review {formatDate(item.due_date)}</TextStyle> : null}
                  </Stack>
                  <Stack gap="$3" css={{ marginTop: "auto" }}>
                    <TextField
                      label="Attachment"
                      type="file"
                      onChange={async (event) => {
                        const file = event.currentTarget.files?.[0];
                        if (!file) return;
                        const path = `${session.user.id}/${item.id}/${file.name}`;
                        const upload = await supabase.storage.from("attachments").upload(path, file, { upsert: true });
                        if (upload.error) return setMessage(upload.error.message);
                        const update = await supabase.from("items").update({ attachment_path: path }).eq("id", item.id);
                        if (update.error) return setMessage(update.error.message);
                        await loadItems();
                      }}
                    />
                    <Flex justifyContent="flex-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <IconButton
                              icon={<TrashIcon width={17} height={17} />}
                              label={`Delete ${item.title}`}
                              variant="ghost"
                              tone="rose"
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Delete ${item.title}?`)) return;
                                const { error } = await supabase.from("items").delete().eq("id", item.id);
                                if (error) return setMessage(error.message);
                                await loadItems();
                              }}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Delete record</TooltipContent>
                      </Tooltip>
                    </Flex>
                  </Stack>
                </Stack>
              </Surface>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
