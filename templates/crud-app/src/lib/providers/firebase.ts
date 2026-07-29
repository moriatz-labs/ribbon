import { initializeApp } from "firebase/app";
import {
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { BackendAdapter, BackendSession, RecordItem } from "./types";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
if (Object.values(config).some((value) => !value)) {
  throw new Error("Set all VITE_FIREBASE_* variables declared in .env.example.");
}

const app = initializeApp(config);
const auth = getAuth(app);
const database = getFirestore(app);
const storage = getStorage(app);
const emailStorageKey = "ribbon.firebase.emailForSignIn";

function activeSession(): BackendSession {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before changing records.");
  return { user: { id: user.uid, email: user.email ?? undefined } };
}

async function finishEmailSignIn() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return;
  const email = window.localStorage.getItem(emailStorageKey);
  if (!email) throw new Error("Open the sign-in link in the browser where it was requested.");
  await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem(emailStorageKey);
  window.history.replaceState({}, document.title, window.location.pathname);
}

export const backend: BackendAdapter = {
  id: "firebase",
  subscribeSession(listener) {
    void finishEmailSignIn().catch((error) => console.error("[firebase:email-link]", error));
    return onAuthStateChanged(auth, (user) => {
      listener(user ? { user: { id: user.uid, email: user.email ?? undefined } } : null);
    });
  },
  async sendMagicLink(email) {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.origin,
      handleCodeInApp: true
    });
    window.localStorage.setItem(emailStorageKey, email);
  },
  async signOut() {
    await signOut(auth);
  },
  async listItems() {
    const session = activeSession();
    const snapshot = await getDocs(
      query(collection(database, "items"), where("owner_id", "==", session.user.id))
    );
    return snapshot.docs
      .map((entry) => {
        const value = entry.data();
        const updated = value.updated_at?.toDate?.();
        return {
          id: entry.id,
          title: String(value.title ?? ""),
          body: String(value.body ?? ""),
          due_date: typeof value.due_date === "string" ? value.due_date : null,
          attachment_path: typeof value.attachment_path === "string" ? value.attachment_path : null,
          updated_at: updated instanceof Date ? updated.toISOString() : new Date(0).toISOString()
        } satisfies RecordItem;
      })
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  },
  async createItem(item) {
    const session = activeSession();
    await addDoc(collection(database, "items"), {
      ...item,
      attachment_path: null,
      owner_id: session.user.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  },
  async deleteItem(id) {
    await deleteDoc(doc(database, "items", id));
  },
  async uploadAttachment(session, itemId, file) {
    const path = `${session.user.id}/${itemId}/${file.name}`;
    const object = ref(storage, `attachments/${path}`);
    await uploadBytes(object, file);
    await getDownloadURL(object);
    await updateDoc(doc(database, "items", itemId), {
      attachment_path: path,
      updated_at: serverTimestamp()
    });
  }
};

