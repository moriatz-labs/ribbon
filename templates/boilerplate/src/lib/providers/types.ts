export interface BackendSession {
  user: {
    id: string;
    email?: string;
  };
}

export interface RecordItem {
  id: string;
  title: string;
  body: string;
  due_date: string | null;
  attachment_path: string | null;
  updated_at: string;
}

export interface NewRecordItem {
  title: string;
  body: string;
  due_date: string | null;
}

export interface BackendAdapter {
  readonly id: "supabase" | "firebase";
  subscribeSession(listener: (session: BackendSession | null) => void): () => void;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  listItems(): Promise<RecordItem[]>;
  createItem(item: NewRecordItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  uploadAttachment?(session: BackendSession, itemId: string, file: File): Promise<void>;
}

