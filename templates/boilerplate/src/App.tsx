import { useEffect, useState } from "react";
import type { FormEvent } from "react";
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
  TooltipTrigger
} from "strawn";
import { LogOutIcon, PlusIcon, TrashIcon } from "strawn-icons";
import { backend } from "./lib/backend";
import type { BackendSession, RecordItem } from "./lib/backend";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export function App() {
  const [session, setSession] = useState<BackendSession | null>(null);
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadItems() {
    setItems(await backend.listItems());
  }

  useEffect(() => backend.subscribeSession(setSession), []);

  useEffect(() => {
    if (session) void loadItems().catch((error: Error) => setMessage(error.message));
  }, [session]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await backend.sendMagicLink(email);
      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sign-in link could not be sent.");
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await backend.createItem({ title, body, due_date: dueDate || null });
      setTitle("");
      setBody("");
      setDueDate("");
      setMessage(null);
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The record could not be saved.");
    }
  }

  async function uploadAttachment(itemId: string, file: File) {
    if (!backend.uploadAttachment || !session) return;
    try {
      await backend.uploadAttachment(session, itemId, file);
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The attachment could not be uploaded.");
    }
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
                  <TextField autoComplete="email" inputMode="email" label="Email address" name="email" onChange={(event) => setEmail(event.currentTarget.value)} required spellCheck={false} type="email" value={email} />
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
                  <IconButton icon={<LogOutIcon width={18} height={18} />} label="Sign out" variant="outline" onClick={() => void backend.signOut()} type="button" />
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
                <Text size="sm" color="$mutedForeground" css={{ margin: 0 }}>Use Strawn components as the default building blocks for every generated product.</Text>
              </Stack>
              <form onSubmit={addItem}>
                <Stack gap="$4">
                  <TextField label="Title" required value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
                  <Textarea label="Details" rows={4} value={body} onChange={(event) => setBody(event.currentTarget.value)} />
                  <TextField id="review-date" label="Review date" type="date" value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} />
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
                    {backend.uploadAttachment ? (
                      <TextField
                        label="Attachment"
                        type="file"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void uploadAttachment(item.id, file);
                        }}
                      />
                    ) : null}
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
                                try {
                                  await backend.deleteItem(item.id);
                                  await loadItems();
                                } catch (error) {
                                  setMessage(error instanceof Error ? error.message : "The record could not be deleted.");
                                }
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
